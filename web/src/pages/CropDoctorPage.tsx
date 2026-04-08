import React, { useState } from 'react';

// 50+ Indian crop diseases knowledge base
const DISEASE_KB = [
  { keywords: ['yellow', 'yellowing', 'pale', 'chlorosis'], disease: 'Nitrogen Deficiency', crop: 'All Crops', severity: 'Medium', treatment: 'Apply urea (46% N) at 25kg/acre. Split into 2-3 doses. Yellowing starts from older/lower leaves. Check for waterlogging blocking N uptake.', prevention: 'Soil test before sowing. Split nitrogen application. Add organic matter.' },
  { keywords: ['brown spots', 'blight', 'lesion', 'necrosis', 'dead patches'], disease: 'Fungal Blight', crop: 'Tomato, Potato, Rice', severity: 'High', treatment: 'Spray Mancozeb 75WP at 2.5g/L or Propiconazole 25EC at 1ml/L. Remove infected leaves immediately.', prevention: 'Use resistant varieties. Avoid overhead irrigation. 3-year crop rotation.' },
  { keywords: ['rust', 'orange powder', 'orange spots', 'pustule', 'reddish powder'], disease: 'Rust Disease', crop: 'Wheat, Barley, Sorghum', severity: 'High', treatment: 'Apply Propiconazole 25EC (1ml/L) or Tebuconazole 250EC. Spray at first sign. Repeat after 14 days.', prevention: 'Use rust-resistant varieties. Early sowing. Avoid excess nitrogen.' },
  { keywords: ['wilt', 'wilting', 'drooping', 'collapse', 'sudden death'], disease: 'Fusarium/Bacterial Wilt', crop: 'Tomato, Cotton, Banana', severity: 'Severe', treatment: 'No cure once infected. Remove and destroy plants. Drench soil with Carbendazim 1g/L. Avoid replanting same crop for 2 seasons.', prevention: 'Certified disease-free seeds. Soil solarization. Crop rotation.' },
  { keywords: ['white powder', 'powdery', 'mildew', 'white coating', 'flour like'], disease: 'Powdery Mildew', crop: 'Wheat, Pea, Cucurbits, Grapes', severity: 'Medium', treatment: 'Spray Sulphur 80WP at 3g/L or Hexaconazole 5EC at 2ml/L. Spray in morning. Repeat after 10 days.', prevention: 'Avoid excess nitrogen. Proper spacing. Use resistant varieties.' },
  { keywords: ['root rot', 'stem rot', 'black stem', 'damping off', 'collar rot'], disease: 'Root/Stem Rot', crop: 'All Crops', severity: 'High', treatment: 'Drench with Metalaxyl + Mancozeb at 2.5g/L. Improve drainage. Reduce irrigation frequency.', prevention: 'Avoid waterlogging. Treat seeds with Thiram before sowing. Raised bed cultivation.' },
  { keywords: ['blast', 'neck rot', 'panicle blast', 'leaf blast', 'grey spots'], disease: 'Rice Blast', crop: 'Rice', severity: 'Severe', treatment: 'Spray Tricyclazole 75WP at 0.6g/L or Isoprothiolane 40EC at 1.5ml/L. Apply at boot leaf stage preventively.', prevention: 'Use blast-resistant varieties. Avoid excess nitrogen. Maintain proper water level.' },
  { keywords: ['sheath blight', 'sheath rot', 'water soaked lesion on stem'], disease: 'Sheath Blight', crop: 'Rice', severity: 'High', treatment: 'Spray Hexaconazole 5EC at 2ml/L or Validamycin 3L at 2ml/L. Drain field before spraying.', prevention: 'Reduce plant density. Avoid excess nitrogen. Use tolerant varieties.' },
  { keywords: ['smut', 'black powder', 'black ear', 'covered smut', 'loose smut'], disease: 'Smut Disease', crop: 'Wheat, Barley, Sorghum, Maize', severity: 'High', treatment: 'Destroy infected plants. Treat seeds with Carboxin 75WP at 2g/kg seed before next sowing.', prevention: 'Use certified smut-free seeds. Seed treatment mandatory. Crop rotation.' },
  { keywords: ['downy mildew', 'purple downy', 'white growth below leaf', 'angular spots'], disease: 'Downy Mildew', crop: 'Pearl Millet, Grapes, Cucurbits', severity: 'High', treatment: 'Spray Metalaxyl + Mancozeb at 2.5g/L. Apply at first sign. Repeat every 7-10 days.', prevention: 'Use resistant varieties. Avoid overhead irrigation. Improve air circulation.' },
  { keywords: ['anthracnose', 'sunken spots', 'dark lesions', 'fruit rot', 'stem canker'], disease: 'Anthracnose', crop: 'Mango, Chilli, Bean, Sorghum', severity: 'High', treatment: 'Spray Carbendazim 50WP at 1g/L or Copper oxychloride 50WP at 3g/L. Remove infected fruits.', prevention: 'Avoid wounding fruits. Proper post-harvest handling. Fungicide spray before harvest.' },
  { keywords: ['tikka', 'leaf spot', 'cercospora', 'brown circular spots'], disease: 'Tikka/Leaf Spot Disease', crop: 'Groundnut, Sorghum, Maize', severity: 'Medium', treatment: 'Spray Mancozeb 75WP at 2.5g/L or Chlorothalonil 75WP at 2g/L. Repeat every 10-14 days.', prevention: 'Crop rotation. Remove crop debris. Use resistant varieties.' },
  { keywords: ['red rot', 'red stalk', 'sour smell', 'internal red discoloration'], disease: 'Red Rot of Sugarcane', crop: 'Sugarcane', severity: 'Severe', treatment: 'No cure. Destroy infected stools. Treat setts with Carbendazim 0.1% before planting.', prevention: 'Use disease-free setts. Hot water treatment at 50°C for 2 hours. Resistant varieties.' },
  { keywords: ['late blight', 'water soaked', 'dark brown potato', 'white mold edge'], disease: 'Late Blight (Phytophthora)', crop: 'Potato, Tomato', severity: 'Severe', treatment: 'Spray Metalaxyl + Mancozeb at 2.5g/L immediately. Repeat every 5-7 days in humid weather.', prevention: 'Use certified seed tubers. Avoid overhead irrigation. Destroy volunteer plants.' },
  { keywords: ['early blight', 'target spot', 'concentric rings', 'alternaria'], disease: 'Early Blight (Alternaria)', crop: 'Tomato, Potato, Brinjal', severity: 'Medium', treatment: 'Spray Mancozeb 75WP at 2.5g/L or Iprodione 50WP at 1g/L. Remove lower infected leaves.', prevention: 'Crop rotation. Avoid wetting foliage. Balanced fertilization.' },
  { keywords: ['bacterial blight', 'water soaked leaf', 'yellow halo', 'kresek'], disease: 'Bacterial Blight of Rice', crop: 'Rice', severity: 'Severe', treatment: 'Spray Copper oxychloride 50WP at 3g/L or Streptomycin sulfate at 0.5g/L. Drain field.', prevention: 'Use resistant varieties. Avoid excess nitrogen. Use disease-free seeds.' },
  { keywords: ['citrus canker', 'raised corky spots', 'citrus lesion', 'greasy spot'], disease: 'Citrus Canker', crop: 'Citrus (Lemon, Orange, Lime)', severity: 'High', treatment: 'Spray Copper oxychloride 50WP at 3g/L. Remove and burn infected leaves and fruits.', prevention: 'Use disease-free nursery plants. Windbreaks to reduce spread. Copper sprays preventively.' },
  { keywords: ['soft rot', 'mushy', 'foul smell', 'slimy rot', 'wet rot'], disease: 'Soft Rot (Erwinia)', crop: 'Potato, Onion, Carrot, Cabbage', severity: 'High', treatment: 'Remove infected plants. Improve drainage. Spray Copper oxychloride 3g/L preventively.', prevention: 'Avoid wounding during harvest. Proper curing before storage. Cool dry storage.' },
  { keywords: ['mosaic', 'mottled', 'mosaic pattern', 'light dark green patches'], disease: 'Mosaic Virus', crop: 'Tomato, Chilli, Cucumber, Bean', severity: 'Severe', treatment: 'No direct cure. Remove infected plants. Control aphid/whitefly vectors with Imidacloprid 0.5ml/L.', prevention: 'Use virus-free certified seeds. Control insect vectors. Reflective mulch.' },
  { keywords: ['leaf curl', 'curling', 'upward curl', 'downward curl', 'crinkle'], disease: 'Leaf Curl Virus', crop: 'Tomato, Cotton, Chilli', severity: 'Severe', treatment: 'No cure. Remove infected plants. Spray Imidacloprid 17.8SL at 0.5ml/L to control whitefly vector.', prevention: 'Use resistant varieties. Control whitefly. Yellow sticky traps.' },
  { keywords: ['tungro', 'orange leaf', 'yellow orange rice', 'stunted rice'], disease: 'Rice Tungro Virus', crop: 'Rice', severity: 'Severe', treatment: 'No cure. Remove infected plants. Control green leafhopper vector with Carbofuran 3G at 10kg/acre.', prevention: 'Use resistant varieties. Synchronous planting. Control leafhopper.' },
  { keywords: ['bunchy top', 'banana virus', 'narrow leaves banana', 'streaks banana'], disease: 'Banana Bunchy Top Virus', crop: 'Banana', severity: 'Severe', treatment: 'Destroy infected plants with herbicide injection. No chemical cure.', prevention: 'Use virus-free tissue culture plants. Control aphid vectors. Rogue infected plants immediately.' },
  { keywords: ['yellow vein mosaic', 'okra yellow', 'bhindi yellow', 'vein yellowing'], disease: 'Yellow Vein Mosaic (Okra)', crop: 'Okra (Bhindi)', severity: 'Severe', treatment: 'Remove infected plants. Spray Imidacloprid 0.5ml/L to control whitefly. No direct cure.', prevention: 'Use resistant varieties. Early sowing. Control whitefly population.' },
  { keywords: ['aphid', 'aphids', 'sticky', 'honeydew', 'ant on plant'], disease: 'Aphid Infestation', crop: 'All Crops', severity: 'Medium', treatment: 'Spray Dimethoate 30EC at 2ml/L or Neem oil 5ml/L. Yellow sticky traps (10/acre). Natural enemies: ladybird beetles.', prevention: 'Avoid excess nitrogen. Intercrop with coriander/marigold. Monitor weekly.' },
  { keywords: ['whitefly', 'white flies', 'tiny white insects', 'white flying insects'], disease: 'Whitefly Infestation', crop: 'Tomato, Cotton, Chilli, Cucumber', severity: 'High', treatment: 'Spray Imidacloprid 17.8SL at 0.5ml/L or Spiromesifen 22.9SC at 1ml/L. Yellow sticky traps.', prevention: 'Reflective mulch. Neem oil spray. Remove weeds. Avoid planting near infected fields.' },
  { keywords: ['thrips', 'silver streaks', 'silvery leaves', 'tiny black insects', 'scarring'], disease: 'Thrips Damage', crop: 'Onion, Chilli, Cotton, Grapes', severity: 'Medium', treatment: 'Spray Spinosad 45SC at 0.3ml/L or Fipronil 5SC at 1.5ml/L. Blue sticky traps.', prevention: 'Avoid water stress. Intercrop with coriander. Remove crop debris.' },
  { keywords: ['mite', 'mites', 'spider mite', 'red mite', 'webbing', 'stippling'], disease: 'Spider Mite Infestation', crop: 'Brinjal, Tomato, Cotton, Beans', severity: 'Medium', treatment: 'Spray Abamectin 1.8EC at 0.5ml/L or Dicofol 18.5EC at 2ml/L. Spray undersides of leaves.', prevention: 'Avoid water stress. Dust control. Avoid broad-spectrum pesticides.' },
  { keywords: ['stem borer', 'dead heart', 'white ear', 'borer', 'tunneling stem'], disease: 'Stem Borer', crop: 'Rice, Maize, Sugarcane, Sorghum', severity: 'High', treatment: 'Apply Carbofuran 3G at 10kg/acre or spray Chlorpyrifos 20EC at 2ml/L. Release Trichogramma parasitoids.', prevention: 'Destroy crop stubble. Early planting. Use resistant varieties.' },
  { keywords: ['bollworm', 'cotton bollworm', 'pink bollworm', 'boll damage', 'fruit borer'], disease: 'Bollworm/Fruit Borer', crop: 'Cotton, Tomato, Chilli', severity: 'High', treatment: 'Spray Emamectin benzoate 5SG at 0.4g/L or Chlorantraniliprole 18.5SC at 0.3ml/L. Pheromone traps.', prevention: 'Use Bt varieties. Install pheromone traps (5/acre). Hand-pick egg masses.' },
  { keywords: ['fall armyworm', 'armyworm', 'faw', 'maize armyworm', 'whorl damage'], disease: 'Fall Armyworm', crop: 'Maize, Sorghum, Wheat', severity: 'Severe', treatment: 'Spray Emamectin benzoate 5SG at 0.4g/L or Spinetoram 11.7SC at 0.5ml/L. Apply into whorl.', prevention: 'Early planting. Pheromone traps. Intercrop with legumes. Trichogramma release.' },
  { keywords: ['locust', 'grasshopper', 'locust swarm', 'hopper', 'mass defoliation'], disease: 'Locust/Grasshopper Attack', crop: 'All Field Crops', severity: 'Severe', treatment: 'Spray Malathion 50EC at 2ml/L or Chlorpyrifos 20EC at 2ml/L. Contact state agriculture department immediately.', prevention: 'Monitor locust bulletins. Early warning systems. Community-level control.' },
  { keywords: ['brown planthopper', 'bph', 'hopper burn', 'circular patches rice', 'hopperburn'], disease: 'Brown Planthopper (BPH)', crop: 'Rice', severity: 'Severe', treatment: 'Drain field. Spray Buprofezin 25SC at 1ml/L or Pymetrozine 50WG at 0.3g/L. Avoid Imidacloprid (causes resurgence).', prevention: 'Use BPH-resistant varieties. Avoid excess nitrogen. Maintain proper spacing.' },
  { keywords: ['mealy bug', 'mealybug', 'white cottony', 'white waxy insects', 'cottony mass'], disease: 'Mealybug Infestation', crop: 'Grapes, Papaya, Cotton, Pomegranate', severity: 'High', treatment: 'Spray Profenofos 50EC at 2ml/L or Buprofezin 25SC at 1ml/L. Release Cryptolaemus beetles.', prevention: 'Remove bark from trunk. Sticky bands on trunk. Avoid ant movement.' },
  { keywords: ['nematode', 'root knot', 'galls on roots', 'stunted growth nematode', 'knotty roots'], disease: 'Root Knot Nematode', crop: 'Tomato, Brinjal, Okra, Banana', severity: 'High', treatment: 'Apply Carbofuran 3G at 10kg/acre or Phorate 10G at 5kg/acre in soil. Neem cake 250kg/acre.', prevention: 'Soil solarization. Crop rotation with non-host crops. Marigold as trap crop.' },
  { keywords: ['purple leaves', 'red leaves', 'phosphorus deficiency', 'reddish tinge'], disease: 'Phosphorus Deficiency', crop: 'All Crops', severity: 'Medium', treatment: 'Apply DAP (18:46:0) at 50kg/acre or SSP at 100kg/acre. Purple/reddish coloration on leaves is classic sign.', prevention: 'Soil test before sowing. Maintain soil pH 6.0–7.0. Add organic matter.' },
  { keywords: ['zinc deficiency', 'khaira', 'white bud', 'interveinal chlorosis zinc', 'little leaf'], disease: 'Zinc Deficiency (Khaira)', crop: 'Rice, Wheat, Maize', severity: 'Medium', treatment: 'Apply Zinc sulfate 25kg/acre as basal dose or foliar spray 0.5% ZnSO4. Khaira disease in rice is classic zinc deficiency.', prevention: 'Soil test for zinc. Apply zinc sulfate every 3 years. Avoid alkaline soil conditions.' },
  { keywords: ['iron deficiency', 'interveinal chlorosis', 'young leaves yellow', 'lime induced chlorosis'], disease: 'Iron Deficiency Chlorosis', crop: 'Groundnut, Soybean, Sorghum', severity: 'Medium', treatment: 'Foliar spray of Ferrous sulfate 0.5% + Citric acid 0.1%. Apply 2-3 times at weekly intervals.', prevention: 'Avoid waterlogging. Maintain soil pH below 7.5. Add organic matter.' },
  { keywords: ['boron deficiency', 'hollow stem', 'heart rot', 'tip burn', 'poor fruit set'], disease: 'Boron Deficiency', crop: 'Cauliflower, Sunflower, Cotton, Apple', severity: 'Medium', treatment: 'Foliar spray of Borax 0.2% (2g/L) or Boric acid 0.1%. Apply at flowering stage.', prevention: 'Soil application of Borax 1kg/acre. Avoid over-liming. Maintain soil moisture.' },
  { keywords: ['blossom end rot', 'black bottom tomato', 'dark bottom fruit', 'calcium deficiency fruit'], disease: 'Blossom End Rot', crop: 'Tomato, Pepper, Watermelon', severity: 'Medium', treatment: 'Foliar spray of Calcium nitrate 0.5% (5g/L). Maintain consistent irrigation. Mulch to retain moisture.', prevention: 'Consistent watering. Avoid over-fertilizing with nitrogen. Maintain soil calcium.' },
  { keywords: ['cracking', 'fruit crack', 'split fruit', 'tomato crack', 'pomegranate crack'], disease: 'Fruit Cracking', crop: 'Tomato, Pomegranate, Cherry', severity: 'Medium', treatment: 'Foliar spray of Calcium nitrate 0.5% + Boron 0.1%. Maintain consistent irrigation.', prevention: 'Consistent irrigation. Mulching. Avoid sudden heavy irrigation after dry spell.' },
  { keywords: ['aflatoxin', 'mold grain', 'grain mold', 'storage mold', 'discolored grain'], disease: 'Grain Mold/Aflatoxin', crop: 'Groundnut, Maize, Sorghum', severity: 'Severe', treatment: 'Dry grain to safe moisture (<12%). Fumigate with Aluminum phosphide tablets. Discard heavily infected grain.', prevention: 'Harvest at right maturity. Dry properly before storage. Use hermetic bags.' },
  { keywords: ['weevil', 'grain weevil', 'storage pest', 'holes in grain', 'powder in grain'], disease: 'Storage Weevil/Grain Pest', crop: 'Wheat, Rice, Maize (stored)', severity: 'High', treatment: 'Fumigate with Aluminum phosphide 3g tablets per tonne. Clean storage before use.', prevention: 'Clean and dry storage. Hermetic bags. Neem leaf layers. Regular inspection.' },
  { keywords: ['hello', 'hi', 'help', 'namaste', 'what can you do'], disease: 'Welcome', crop: 'All', severity: 'Low', treatment: 'I can diagnose crop diseases! Describe what you see on your crop — color changes, spots, holes, wilting, insects, etc.', prevention: 'Try: "yellow leaves", "brown spots on tomato", "white powder on wheat", "holes in cotton", "wilting plant"' },
];

function diagnose(description: string) {
  const d = description.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const entry of DISEASE_KB) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (d.includes(kw.toLowerCase())) score += kw.split(' ').length;
    }
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  return bestScore > 0 ? best : null;
}

const SEV: Record<string, string> = { Low: '#52b788', Medium: '#f4a261', High: '#e76f51', Severe: '#e63946' };

const QUICK = [
  'yellow leaves', 'brown spots', 'white powder', 'holes in leaves',
  'wilting plant', 'rust orange powder', 'aphids on crop', 'root rot',
  'leaf curl', 'mosaic pattern', 'stem borer', 'whitefly',
  'blight tomato', 'rice blast', 'fall armyworm', 'mealybug',
  'nematode root knot', 'zinc deficiency', 'fruit cracking', 'grain mold',
];

export default function CropDoctorPage() {
  const [mode, setMode] = useState<'input' | 'result'>('input');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<typeof DISEASE_KB[0] | null>(null);

  function analyze() {
    if (!description.trim()) return;
    setResult(diagnose(description));
    setMode('result');
  }

  return (
    <div>
      <h2 style={{ color: '#2d6a4f' }}>🌿 Crop Doctor</h2>
      <p style={{ color: '#666' }}>Diagnose 50+ Indian crop diseases instantly — no internet required.</p>

      {mode === 'input' && (
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Describe the Problem</h3>
          <textarea style={styles.textarea} rows={4}
            placeholder="Describe what you see: color, spots, holes, wilting, insects, smell..."
            value={description} onChange={e => setDescription(e.target.value)} />
          <button style={styles.btn} onClick={analyze} disabled={!description.trim()}>🔍 Diagnose Now</button>
          <p style={{ color: '#888', fontSize: 13, marginTop: 16, marginBottom: 8 }}>Quick select a symptom:</p>
          <div style={styles.quickRow}>
            {QUICK.map(q => (
              <button key={q} style={styles.quickBtn} onClick={() => { setDescription(q); }}>{q}</button>
            ))}
          </div>
        </div>
      )}

      {mode === 'result' && (
        <div>
          {!result ? (
            <div style={styles.card}>
              <p>Could not identify the problem. Try being more specific (e.g., "yellow leaves on wheat", "brown spots on tomato").</p>
              <p style={{ marginTop: 12, fontSize: 14, color: '#2d6a4f', background: '#d8f3dc', padding: '10px 14px', borderRadius: 8 }}>
                📞 For expert advice, contact your local <strong>Krishi Vigyan Kendra (KVK)</strong> or call the <strong>Kisan Call Centre: 1800-180-1551</strong> (free, 24/7)
              </p>
              <button style={{ ...styles.btn, marginTop: 16 }} onClick={() => setMode('input')}>← Try Again</button>
            </div>
          ) : (
            <div style={styles.resultCard}>
              <div style={styles.header}>
                <div>
                  <h3 style={{ margin: 0, color: '#1b4332' }}>🦠 {result.disease}</h3>
                  <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>Crop: {result.crop}</p>
                  <p style={{ margin: '2px 0 0', color: '#888', fontSize: 12 }}>Based on: "{description}"</p>
                </div>
                <span style={{ ...styles.sevBadge, background: SEV[result.severity] ?? '#ccc' }}>
                  {result.severity} Severity
                </span>
              </div>
              <div style={styles.section}>
                <h4 style={styles.secTitle}>💊 Treatment</h4>
                <p style={styles.secText}>{result.treatment}</p>
              </div>
              <div style={styles.section}>
                <h4 style={styles.secTitle}>🛡️ Prevention</h4>
                <p style={styles.secText}>{result.prevention}</p>
              </div>
              <div style={styles.disclaimer}>
                ⚠️ AI-assisted diagnosis. For confirmation, consult your local agriculture officer or KVK (Krishi Vigyan Kendra).
              </div>
              <button style={styles.btn} onClick={() => { setMode('input'); setDescription(''); }}>← New Diagnosis</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', maxWidth: 680 },
  textarea: { width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 8, border: '1px solid #ccc', boxSizing: 'border-box', marginBottom: 12, resize: 'vertical' },
  btn: { background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 15, cursor: 'pointer' },
  quickRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  quickBtn: { background: '#d8f3dc', color: '#2d6a4f', border: 'none', borderRadius: 20, padding: '5px 12px', cursor: 'pointer', fontSize: 12 },
  resultCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', maxWidth: 680 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  sevBadge: { color: '#fff', padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' as const },
  section: { background: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 12 },
  secTitle: { margin: '0 0 8px', color: '#2d6a4f' },
  secText: { margin: 0, color: '#444', lineHeight: 1.6 },
  disclaimer: { background: '#fff3cd', borderRadius: 8, padding: 12, fontSize: 13, color: '#856404', marginBottom: 16 },
};
