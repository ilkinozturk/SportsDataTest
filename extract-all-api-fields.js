const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.FOOTYSTATS_API_KEY;
const BASE_URL = process.env.FOOTYSTATS_BASE_URL || 'https://api.football-data-api.com';

async function extractAllApiFields() {
  try {
    console.log('🔍 API\'den TÜM FIELD\'LARI ÇIKARIYORUM...\n');
    
    // API'den veri al
    const teamId = 836;
    const seasonId = 14153;
    const url = `${BASE_URL}/league-teams?key=${API_KEY}&season_id=${seasonId}&include=stats`;
    const response = await axios.get(url);
    const team = response.data.data.find(t => t.id === teamId);
    
    const stats = team.stats;
    const additionalInfo = stats.additional_info;
    
    console.log('📊 STATS OBJESİNDEKİ TÜM FIELD\'LAR:');
    console.log('=====================================');
    
    // Stats objesindeki tüm field'ları listele
    const statsFields = Object.keys(stats).filter(key => key !== 'additional_info');
    statsFields.sort().forEach((field, index) => {
      const value = stats[field];
      const type = typeof value;
      const valueStr = type === 'number' ? value : (type === 'string' ? `"${value}"` : String(value));
      console.log(`${(index + 1).toString().padStart(3, ' ')}. ${field}: ${valueStr} (${type})`);
    });
    
    console.log(`\n📊 TOPLAM STATS FIELD: ${statsFields.length}\n`);
    
    console.log('📊 ADDITIONAL_INFO OBJESİNDEKİ TÜM FIELD\'LAR:');
    console.log('===============================================');
    
    // Additional_info objesindeki tüm field'ları listele
    const additionalFields = Object.keys(additionalInfo || {});
    additionalFields.sort().forEach((field, index) => {
      const value = additionalInfo[field];
      const type = typeof value;
      const valueStr = type === 'number' ? value : (type === 'string' ? `"${value}"` : String(value));
      console.log(`${(index + 1).toString().padStart(3, ' ')}. ${field}: ${valueStr} (${type})`);
    });
    
    console.log(`\n📊 TOPLAM ADDITIONAL_INFO FIELD: ${additionalFields.length}\n`);
    
    // Tüm field'ları bir araya getir
    const allFields = [...statsFields, ...additionalFields.map(f => `additional_info.${f}`)];
    console.log(`🎯 TOPLAM API FIELD SAYISI: ${allFields.length}`);
    
    // Field'ları kategorilere ayır
    console.log('\n📋 FIELD KATEGORİLERİ:');
    console.log('=====================');
    
    const categories = {
      goals: allFields.filter(f => f.includes('goal') || f.includes('Goal') || f.includes('scored') || f.includes('Scored')),
      cards: allFields.filter(f => f.includes('card') || f.includes('Card')),
      corners: allFields.filter(f => f.includes('corner') || f.includes('Corner')),
      shots: allFields.filter(f => f.includes('shot') || f.includes('Shot')),
      btts: allFields.filter(f => f.includes('btts') || f.includes('BTTS')),
      xg: allFields.filter(f => f.includes('xg') || f.includes('XG') || f.includes('xG')),
      percentages: allFields.filter(f => f.includes('percentage') || f.includes('Percentage')),
      averages: allFields.filter(f => f.includes('avg') || f.includes('Avg') || f.includes('AVG')),
      totals: allFields.filter(f => f.includes('total') || f.includes('Total')),
      home: allFields.filter(f => f.includes('home') || f.includes('Home')),
      away: allFields.filter(f => f.includes('away') || f.includes('Away')),
      overall: allFields.filter(f => f.includes('overall') || f.includes('Overall'))
    };
    
    Object.entries(categories).forEach(([category, fields]) => {
      console.log(`\n${category.toUpperCase()}: ${fields.length} field`);
      fields.forEach((field, i) => console.log(`  ${i+1}. ${field}`));
    });
    
    // JavaScript objesi olarak kaydet
    const fieldMapping = {
      stats: {},
      additional_info: {}
    };
    
    statsFields.forEach(field => {
      fieldMapping.stats[field] = stats[field];
    });
    
    additionalFields.forEach(field => {
      fieldMapping.additional_info[field] = additionalInfo[field];
    });
    
    // Dosyaya kaydet
    require('fs').writeFileSync(
      '/mnt/d/SportsData.Ai/api-fields-complete.json', 
      JSON.stringify(fieldMapping, null, 2)
    );
    
    console.log('\n✅ Tüm field\'lar api-fields-complete.json dosyasına kaydedildi!');
    
    // Önemli field'ları belirle
    console.log('\n🎯 ÖNEMLI FIELD\'LAR (0 olmayan):');
    console.log('================================');
    
    const importantFields = [];
    statsFields.forEach(field => {
      const value = stats[field];
      if (typeof value === 'number' && value > 0) {
        importantFields.push(`stats.${field}: ${value}`);
      }
    });
    
    additionalFields.forEach(field => {
      const value = additionalInfo[field];
      if (typeof value === 'number' && value > 0) {
        importantFields.push(`additional_info.${field}: ${value}`);
      }
    });
    
    importantFields.forEach((field, i) => {
      console.log(`${i+1}. ${field}`);
    });
    
    console.log(`\n🎯 TOPLAM DEĞERLI FIELD: ${importantFields.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

extractAllApiFields();