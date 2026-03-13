from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import torch.nn as nn
from torch_geometric.nn import GATConv, global_mean_pool
from torch_geometric.data import Data
import joblib
import requests
import pandas as pd
import io
import os

app = FastAPI(title="GenomeX Hybrid API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. DEFINE PYTORCH ARCHITECTURE
# ==========================================
class UltimateGenomeXHybrid(nn.Module):
    def __init__(self, node_dim=21, esm_dim=480, tabular_dim=7, hidden_dim=128):
        super().__init__()
        self.gnn_conv1 = GATConv(node_dim, hidden_dim)
        self.gnn_conv2 = GATConv(hidden_dim, hidden_dim)
        self.bilstm = nn.LSTM(input_size=esm_dim, hidden_size=hidden_dim // 2, 
                              num_layers=1, bidirectional=True, batch_first=True)
        self.tabular_net = nn.Sequential(nn.Linear(tabular_dim, 64), nn.BatchNorm1d(64), nn.ReLU())
        self.fusion = nn.Sequential(
            nn.Linear(320, 256), nn.BatchNorm1d(256), nn.ReLU(), nn.Dropout(0.4),
            nn.Linear(256, 128), nn.ReLU(), nn.Dropout(0.3), nn.Linear(128, 1)
        )

    def forward(self, data):
        x, edge_index, batch = data.x, data.edge_index, data.batch
        esm_emb = data.esm_emb.view(-1, 1, 480) 
        tab_feats = data.tabular_feats.view(-1, 7)
        
        graph_x = self.gnn_conv2(self.gnn_conv1(x, edge_index).relu(), edge_index).relu()
        graph_embed = global_mean_pool(graph_x, batch)
        
        lstm_out, _ = self.bilstm(esm_emb)
        seq_embed = lstm_out[:, -1, :] 
        tab_embed = self.tabular_net(tab_feats)
        return self.fusion(torch.cat([graph_embed, seq_embed, tab_embed], dim=1))

# ==========================================
# 2. LOAD BOTH AI BRAINS
# ==========================================
device = torch.device("cpu")
pytorch_model = None
tabular_model = None

try:
    tabular_model = joblib.load("./models/genomex_catboost_final.pkl")
    print("✅ Tabular Model loaded successfully!")
except Exception as e:
    print(f"⚠️ Failed to load Tabular model: {e}")

try:
    pytorch_model = UltimateGenomeXHybrid().to(device)
    pytorch_model.load_state_dict(torch.load('./models/genomeX_hybrid_best.pth', map_location=device))
    pytorch_model.eval()
    print("✅ PyTorch GNN loaded successfully!")
except Exception as e:
    print(f"⚠️ Failed to load PyTorch GNN: {e}")

# ==========================================
# 3. UPGRADED FEATURE EXTRACTION
# ==========================================
def get_variant_clues(chrom, pos, alt):
    server = "https://rest.ensembl.org"
    endpoint = f"/vep/human/region/{chrom}:{pos}-{pos}/{alt}?af=1&CADD=1"
    
    # Default values
    gnomad_af, sift_score, cadd_score = 0.0, 0.05, 0.0
    is_nonsense, is_missense, is_synonymous, is_splice = 0, 0, 0, 0
    gene_symbol = "Unknown"
    
    try:
        response = requests.get(server + endpoint, headers={"Content-Type": "application/json"})
        if not response.ok: return gnomad_af, sift_score, cadd_score, is_nonsense, is_missense, is_synonymous, is_splice, gene_symbol
        data = response.json()[0]
        
        for colocated in data.get('colocated_variants', []):
            freqs = colocated.get('frequencies', {}).get(alt, {})
            for key in ['gnomad', 'gnomade', 'gnomadg']:
                if key in freqs:
                    gnomad_af = float(freqs[key])
                    break
            if gnomad_af > 0.0: break
                
        sift_found = False
        for t in data.get('transcript_consequences', []):
            # Extract Gene Symbol for the PyTorch .pt file lookup!
            if 'gene_symbol' in t and gene_symbol == "Unknown":
                gene_symbol = t['gene_symbol']

            terms = t.get('consequence_terms', [])
            if 'stop_gained' in terms: is_nonsense = 1
            if 'missense_variant' in terms: is_missense = 1
            if 'synonymous_variant' in terms: is_synonymous = 1
            if any('splice' in term for term in terms): is_splice = 1
            
            if 'sift_score' in t:
                sift_found = True
                if t['sift_score'] < sift_score: sift_score = t['sift_score']
            if 'cadd_phred' in t and t['cadd_phred'] > cadd_score:
                cadd_score = t['cadd_phred']
                    
        if not sift_found: sift_score = 0.05
        return gnomad_af, sift_score, cadd_score, is_nonsense, is_missense, is_synonymous, is_splice, gene_symbol
    except:
        return gnomad_af, sift_score, cadd_score, is_nonsense, is_missense, is_synonymous, is_splice, gene_symbol

# ==========================================
# 4. THE ENDPOINT
# ==========================================
@app.post("/analyze_csv")
async def analyze_csv(file: UploadFile = File(...)):
    if tabular_model is None:
        raise HTTPException(status_code=503, detail="Tabular AI model not loaded.")
        
    try:
        content = await file.read()
        text = content.decode('utf-8')
        df = pd.read_csv(io.StringIO(text))
        
        results = []
        for index, row in df.iterrows():
            # Support multiple possible column names for the Variant ID
            variant = row.get('Variant_ID') or row.get('variant_id') or row.get('VARIANT_ID')
            if not variant:
                continue
                
            parts = str(variant).split(':')
            if len(parts) != 4:
                continue
            
            chrom, pos, ref, alt = parts
            
            # Fetch tabular clues AND the Gene Symbol dynamically
            af, sift, cadd, nonsense, missense, synonymous, splice, gene_symbol = get_variant_clues(chrom, pos, alt)
            
            # 1. Run the Tabular Model (Always works)
            input_data = pd.DataFrame([[af, sift, cadd, nonsense, missense, synonymous, splice]], 
                                      columns=['gnomAD_AF', 'SIFT_Score', 'CADD_Score', 'Is_Nonsense', 'Is_Missense', 'Is_Synonymous', 'Is_Splice_Site'])
            
            tabular_pred = tabular_model.predict(input_data)[0]
            # Convert prediction to a probability-like score for ensemble math
            tabular_prob = 0.95 if tabular_pred == 1 else 0.05 
            tabular_confidence = tabular_model.predict_proba(input_data)[0].max() * 100

            # 2. Try the PyTorch GNN (If files exist)
            pytorch_prob = None
            if pytorch_model is not None and gene_symbol != "Unknown":
                sanitized_variant = str(variant).replace(":", "_")
                base_dir = "./gnn-model-weights"
                graph_path = f"{base_dir}/{gene_symbol}.pt"
                emb_path = f"{base_dir}/emb_{sanitized_variant}.pt"
                
                if os.path.exists(graph_path) and os.path.exists(emb_path):
                    try:
                        graph_data = torch.load(graph_path, weights_only=False, map_location=device)
                        esm_emb = torch.load(emb_path, weights_only=False, map_location=device)
                        
                        tab_tensor = torch.tensor([[af, sift, cadd, nonsense, missense, synonymous, splice]], dtype=torch.float32)
                        batch = torch.zeros(graph_data.x.size(0), dtype=torch.long)
                        inference_data = Data(x=graph_data.x, edge_index=graph_data.edge_index, 
                                              esm_emb=esm_emb, tabular_feats=tab_tensor, batch=batch).to(device)
                        
                        with torch.no_grad():
                            raw_logit = pytorch_model(inference_data)
                            pytorch_prob = torch.sigmoid(raw_logit).item()
                    except Exception as e:
                        print(f"Skipping PyTorch for {variant} due to error: {e}")

            # 3. Ensemble Logic (Graceful Fallback)
            if pytorch_prob is not None:
                # Both models succeeded -> average them
                final_probability = (pytorch_prob + tabular_prob) / 2
                classification = "Pathogenic" if final_probability >= 0.5 else "Benign"
                final_confidence = final_probability * 100 if classification == "Pathogenic" else (1 - final_probability) * 100
            else:
                # PyTorch failed/missing files -> rely purely on Tabular
                if tabular_pred == 1:
                    classification = "Pathogenic"
                elif cadd == 0:
                    classification = "Data Insufficient"
                else:
                    classification = "Benign"
                final_confidence = tabular_confidence

            # 4. Return formatted data for React
            results.append({
                "variant_id": variant,
                "gene_symbol": gene_symbol,
                "classification": classification,
                "confidence_score": round(final_confidence, 2),
                "pytorch_confidence": round(pytorch_prob * 100, 2) if pytorch_prob else "N/A",
                "catboost_confidence": round(tabular_confidence, 2),
                "features": {
                    "cadd_score": round(cadd, 2),
                    "sift_score": round(sift, 2),
                    "gnomad_af": round(af, 6)
                }
            })
            
        return {"results": results}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))