import streamlit as st
import joblib
import requests
import pandas as pd

# 1. Load your upgraded AI Brain
@st.cache_resource 
def load_model():
    # Make sure this matches the exact name of your newly saved model!
    return joblib.load("synaptix_clinical_ai_2.pkl") 

model = load_model()

# 2. The Upgraded API function
def get_variant_clues(chrom, pos, alt):
    server = "https://rest.ensembl.org"
    endpoint = f"/vep/human/region/{chrom}:{pos}-{pos}/{alt}?af=1&CADD=1"
    try:
        response = requests.get(server + endpoint, headers={"Content-Type": "application/json"})
        # Added the 3 new default zeros to the error return
        if not response.ok: return 0.0, 0.05, 0.0, 0, 0, 0, 0 
        data = response.json()[0]
        
        gnomad_af = 0.0  
        for colocated in data.get('colocated_variants', []):
            freqs = colocated.get('frequencies', {}).get(alt, {})
            for key in ['gnomad', 'gnomade', 'gnomadg']:
                if key in freqs:
                    gnomad_af = float(freqs[key])
                    break
            if gnomad_af > 0.0: break
                
        # Initialize all 7 variables
        sift_score, cadd_score, is_nonsense = 1.0, 0.0, 0
        is_missense, is_synonymous, is_splice = 0, 0, 0
        sift_found = False
        
        for t in data.get('transcript_consequences', []):
            terms = t.get('consequence_terms', [])
            
            # Extract the 4 structural flags
            if 'stop_gained' in terms: is_nonsense = 1
            if 'missense_variant' in terms: is_missense = 1
            if 'synonymous_variant' in terms: is_synonymous = 1
            if any('splice' in term for term in terms): is_splice = 1
            
            # Extract Physics scores
            if 'sift_score' in t:
                sift_found = True
                if t['sift_score'] < sift_score: sift_score = t['sift_score']
            if 'cadd_phred' in t and t['cadd_phred'] > cadd_score:
                cadd_score = t['cadd_phred']
                    
        if not sift_found: sift_score = 0.05
        
        # Return all 7 clues
        return gnomad_af, sift_score, cadd_score, is_nonsense, is_missense, is_synonymous, is_splice
    except:
        # Failsafe return with 7 values
        return 0.0, 0.05, 0.0, 0, 0, 0, 0

# --- THE USER INTERFACE ---
st.set_page_config(page_title="Synaptix AI", page_icon="🧬")
st.title("🧬 Synaptix: Clinical Variant Triage AI")
st.write("Enter a novel genetic variant to predict pathogenicity using real-time API annotation and Random Forest Machine Learning.")

# Input box for the doctor
variant_input = st.text_input("Enter Variant (Format: Chromosome:Position:Ref:Alt)", "17:41244408:T:C")

if st.button("Analyze Variant"):
    with st.spinner("Pinging Ensembl API & Running AI Model..."):
        try:
            # Parse the input
            parts = variant_input.split(':')
            chrom, pos, ref, alt = parts[0], parts[1], parts[2], parts[3]
            
            # Fetch all 7 real-time clues
            af, sift, cadd, nonsense, missense, synonymous, splice = get_variant_clues(chrom, pos, alt)
            
            # Prepare the data exactly like our enriched CSV
            input_data = pd.DataFrame([[af, sift, cadd, nonsense, missense, synonymous, splice]], 
                                      columns=['gnomAD_AF', 'SIFT_Score', 'CADD_Score', 'Is_Nonsense', 'Is_Missense', 'Is_Synonymous', 'Is_Splice_Site'])
            
            # Make the prediction
            prediction = model.predict(input_data)[0]
            confidence = model.predict_proba(input_data)[0].max() * 100
            
            # Display Results Beautifully
            st.divider()
            if prediction == 1:
                st.error(f"🚨 **PREDICTION: PATHOGENIC** ({confidence:.1f}% Confidence)")
            elif input_data['CADD_Score'][0] == 0:
                st.warning(f"⚠️ **WARNING: Data Insufficient** ({confidence:.1f}% Confidence)")
            else:
                st.success(f"✅ **PREDICTION: BENIGN** ({confidence:.1f}% Confidence)")
                
            st.subheader("Biological Features Extracted:")
            
            # Row 1: The Continuous Math Scores
            col1, col2, col3 = st.columns(3)
            col1.metric("CADD Score", f"{cadd:.2f}")
            col2.metric("gnomAD Freq", f"{af:.6f}")
            col3.metric("SIFT Score", f"{sift:.2f}")
            
            st.write("") # Add a little space
            
            # Row 2: The Structural Binary Flags
            col4, col5, col6, col7 = st.columns(4)
            col4.metric("Is Nonsense", "Yes" if nonsense == 1 else "No")
            col5.metric("Is Missense", "Yes" if missense == 1 else "No")
            col6.metric("Is Synonymous", "Yes" if synonymous == 1 else "No")
            col7.metric("Is Splice Site", "Yes" if splice == 1 else "No")

        except Exception as e:
            st.error("Invalid format! Please use standard format like 17:41244408:T:C")
            st.error(f"System Error: {e}") # Helpful for debugging if something breaks
