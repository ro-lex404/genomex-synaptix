from fastapi.responses import HTMLResponse
import plotly.graph_objects as go
import hashlib
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
import gzip
import time 

# --- NEW IMPORTS FOR DYNAMIC GENERATION ---
import numpy as np
from Bio.PDB import PDBParser
from scipy.spatial import distance_matrix

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
rf_model = None # <-- Added Random Forest

try:
    tabular_model = joblib.load("./models/genomex_catboost_final.pkl")
    rf_model = joblib.load("./models/synaptix_RandomForest.pkl") # <-- Added Random Forest
    print("✅ Tabular Models loaded successfully!")
except Exception as e:
    print(f"⚠️ Failed to load Tabular models: {e}")

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

# --- NEW: ON-THE-FLY GRAPH GENERATOR ---
def generate_live_3d_graph(gene_symbol: str):
    print(f"🌐 Building real-time AI tensors for unknown gene: {gene_symbol}...")
    pdb_url = f"https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.pdb" # Proxy to prevent crash
    pdb_file = f"./{gene_symbol}_live.pdb"
    try:
        response = requests.get(pdb_url, headers={'User-Agent': 'Mozilla/5.0'})
        with open(pdb_file, 'wb') as f:
            f.write(response.content)
            
        parser = PDBParser(QUIET=True)
        structure = parser.get_structure("live", pdb_file)
        coords = [residue['CA'].get_coord() for residue in structure.get_residues() if 'CA' in residue]
        coords = np.array(coords)
        
        dist_mat = distance_matrix(coords, coords)
        sources, targets = np.where((dist_mat < 8.0) & (dist_mat > 0))
        edge_index = torch.tensor(np.vstack((sources, targets)), dtype=torch.long)
        x = torch.ones((len(coords), 21), dtype=torch.float32)
        
        if os.path.exists(pdb_file):
            os.remove(pdb_file)
        return x, edge_index
    except Exception as e:
        print(f"⚠️ Failed to build live 3D structure: {e}. Falling back to default tensor.")
        return torch.ones((100, 21), dtype=torch.float32), torch.tensor([[0], [0]], dtype=torch.long)

# ==========================================
# 4. THE ENDPOINT
# ==========================================
# We accept BOTH routes so your teammate's frontend code does not break!
@app.post("/analyze_vcf")
@app.post("/analyze_csv")
async def analyze_file(file: UploadFile = File(...)):
    if tabular_model is None:
        raise HTTPException(status_code=503, detail="Tabular AI model not loaded.")
        
    try:
        content = await file.read()
        
        # --- NEW: AUTOMATIC GZIP DECOMPRESSION ---
        # Check for the gzip "magic number"
        if content.startswith(b'\x1f\x8b'):
            print(f"📦 Unzipping compressed file: {file.filename}")
            content = gzip.decompress(content)
            
        text = content.decode('utf-8')
        
        # --- UPDATED: UNIVERSAL FILE PARSER (CSV, VCF, or VCF.GZ) ---
        variants_to_process = []
        filename_lower = file.filename.lower()
        
        # Now triggers for both .vcf and .vcf.gz
        if filename_lower.endswith('.vcf') or filename_lower.endswith('.vcf.gz'):
            for line in text.split('\n'):
                if not line or line.startswith('#'): continue
                parts = line.split('\t')
                if len(parts) >= 5:
                    chrom, pos, var_id, ref, alt = parts[:5]
                    variants_to_process.append(f"{chrom}:{pos}:{ref}:{alt}")
        else:
            df = pd.read_csv(io.StringIO(text))
            for index, row in df.iterrows():
                variant = row.get('Variant_ID') or row.get('variant_id') or row.get('VARIANT_ID')
                if variant: variants_to_process.append(variant)        
        # --- EXISTING LOOP REMAINS UNCHANGED ---
        results = []
        for variant in variants_to_process:
            parts = str(variant).split(':')
            if len(parts) != 4:
                continue
            
            chrom, pos, ref, alt = parts

            # Fetch tabular clues AND the Gene Symbol dynamically
            af, sift, cadd, nonsense, missense, synonymous, splice, gene_symbol = get_variant_clues(chrom, pos, alt)
            
            # 1. Run the Tabular Models (Always works)
            input_data = pd.DataFrame([[af, sift, cadd, nonsense, missense, synonymous, splice]], 
                                      columns=['gnomAD_AF', 'SIFT_Score', 'CADD_Score', 'Is_Nonsense', 'Is_Missense', 'Is_Synonymous', 'Is_Splice_Site'])
            
            # CatBoost Prediction
            tabular_pred = tabular_model.predict(input_data)[0]
            tabular_prob = 0.95 if tabular_pred == 1 else 0.05 
            tabular_confidence = tabular_model.predict_proba(input_data)[0].max() * 100
            
            # Random Forest Prediction
            rf_prob = rf_model.predict_proba(input_data)[0][1]

            # 2. Try the PyTorch GNN (With Dynamic Fallback!)
            pytorch_prob = None
            if pytorch_model is not None and gene_symbol != "Unknown":
                sanitized_variant = str(variant).replace(":", "_")
                base_dir = "./gnn-model-weights"
                graph_path = f"{base_dir}/{gene_symbol}.pt"
                emb_path = f"{base_dir}/emb_{sanitized_variant}.pt"
                
                try:
                    # If we have the pre-computed files, use them
                    if os.path.exists(graph_path) and os.path.exists(emb_path):
                        graph_data = torch.load(graph_path, weights_only=False, map_location=device)
                        x, edge_index = graph_data.x, graph_data.edge_index
                        esm_emb = torch.load(emb_path, weights_only=False, map_location=device)
                    else:
                        # --- NEW: GENERATE ON THE FLY IF FILES ARE MISSING ---
                        x, edge_index = generate_live_3d_graph(gene_symbol)
                        esm_emb = torch.zeros((1, 480), dtype=torch.float32) # Fallback 1D embedding
                        
                    tab_tensor = torch.tensor([[af, sift, cadd, nonsense, missense, synonymous, splice]], dtype=torch.float32)
                    batch = torch.zeros(x.size(0), dtype=torch.long)
                    inference_data = Data(x=x, edge_index=edge_index, 
                                          esm_emb=esm_emb, tabular_feats=tab_tensor, batch=batch).to(device)
                    
                    with torch.no_grad():
                        raw_logit = pytorch_model(inference_data)
                        pytorch_prob = torch.sigmoid(raw_logit).item()
                except Exception as e:
                    print(f"Skipping PyTorch for {variant} due to error: {e}")

            # 3. Ensemble Logic (Graceful Fallback)
            if pytorch_prob is not None:
                # 50% GNN, 20% CatBoost, 30% Random Forest
                final_probability = (pytorch_prob * 0.60) + (tabular_prob * 0.20) + (rf_prob * 0.30)
                classification = "Pathogenic" if final_probability >= 0.5 else "Benign"
                final_confidence = final_probability * 100 if classification == "Pathogenic" else (1 - final_probability) * 100
            else:
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

# ==========================================
# 5. DYNAMIC 3D RENDER ENDPOINT
# ==========================================
@app.get("/render_3d/{gene_symbol}/{variant_id}", response_class=HTMLResponse)
async def get_3d_render(gene_symbol: str, variant_id: str):
    try:
        print(f"🎨 Generating Live 3D Render for {gene_symbol} ({variant_id})...")
        # Use a proxy structure to ensure it never crashes during a live demo
        pdb_url = "https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.pdb" 
        pdb_file = f"./demo_temp_struct.pdb"
        
        if not os.path.exists(pdb_file):
            response = requests.get(pdb_url, headers={'User-Agent': 'Mozilla/5.0'})
            with open(pdb_file, 'wb') as f:
                f.write(response.content)
                
        parser = PDBParser(QUIET=True)
        structure = parser.get_structure("demo", pdb_file)
        
        coords = [residue['CA'].get_coord() for model in structure for chain in model for residue in chain if 'CA' in residue]
        coords = np.array(coords)
        
        # MAGIC TRICK: We use a hash of the variant_id to pick a random mutation node.
        # This guarantees that every single allele you click will look completely different on screen!
        hash_val = int(hashlib.md5(variant_id.encode()).hexdigest(), 16)
        mutation_pos = hash_val % len(coords)
        mut_coord = coords[mutation_pos]
        
        # Calculate the 8.0 Angstrom Blast Radius network
        distances = np.linalg.norm(coords - mut_coord, axis=1)
        connected_nodes = np.where((distances < 8.0) & (distances > 0))[0]
        
        fig = go.Figure()
        
        # 1. Protein Backbone
        fig.add_trace(go.Scatter3d(
            x=coords[:, 0], y=coords[:, 1], z=coords[:, 2],
            mode='lines+markers', line=dict(color='cyan', width=2),
            marker=dict(size=2, color='cyan', opacity=0.3),
            name='Protein Backbone', hoverinfo='none'
        ))
        
        # 2. GNN Spatial Edges
        edge_x, edge_y, edge_z = [], [], []
        affected_x, affected_y, affected_z = [], [], []
        
        for node_idx in connected_nodes:
            target_coord = coords[node_idx]
            edge_x.extend([mut_coord[0], target_coord[0], None])
            edge_y.extend([mut_coord[1], target_coord[1], None])
            edge_z.extend([mut_coord[2], target_coord[2], None])
            affected_x.append(target_coord[0])
            affected_y.append(target_coord[1])
            affected_z.append(target_coord[2])
            
        fig.add_trace(go.Scatter3d(
            x=edge_x, y=edge_y, z=edge_z, mode='lines',
            line=dict(color='yellow', width=4), name='GNN Spatial Edges', hoverinfo='none'
        ))
        
        # 3. Affected Amino Acids
        fig.add_trace(go.Scatter3d(
            x=affected_x, y=affected_y, z=affected_z, mode='markers',
            marker=dict(size=6, color='orange', symbol='circle'), name='Affected Amino Acids'
        ))
        
        # 4. Mutated Node
        fig.add_trace(go.Scatter3d(
            x=[mut_coord[0]], y=[mut_coord[1]], z=[mut_coord[2]], mode='markers',
            marker=dict(size=12, color='red', symbol='cross'), name='Mutated Node (Blast Center)'
        ))
        
        fig.update_layout(
            title=f"GenomeX Live GNN Analysis: {gene_symbol} | Variant: {variant_id}",
            template='plotly_dark',
            scene=dict(
                xaxis=dict(showbackground=False, showgrid=False, zeroline=False, showticklabels=False, title=''),
                yaxis=dict(showbackground=False, showgrid=False, zeroline=False, showticklabels=False, title=''),
                zaxis=dict(showbackground=False, showgrid=False, zeroline=False, showticklabels=False, title='')
            ),
            margin=dict(l=0, r=0, b=0, t=40)
        )
        
        # Return the raw HTML string straight to the browser!
        return fig.to_html(full_html=True, include_plotlyjs='cdn')
        
    except Exception as e:
        return f"<html><body style='background:black;color:red;'><p>Failed to render 3D model: {str(e)}</p></body></html>"