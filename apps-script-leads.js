// ── Google Apps Script — colar em Extensions > Apps Script do seu Sheet ──
// Depois: Deploy > New deployment > Web app > Execute as: Me > Anyone

const SHEET_ID = '1AtBHJjbcl755ZGW_TL6V8QM3pguUDvHJpjizEh4sovw';
const SHEET_NAME = 'Leads';

const BALDE_LABEL = { A: 'Filtro', B: 'Rastreamento', C: 'Velocidade', D: 'Origem', E: 'Nutrição', X: 'Desqualificado' };

function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const ss     = SpreadsheetApp.openById(SHEET_ID);
    let sheet    = ss.getSheetByName(SHEET_NAME);

    // Cria aba e cabeçalho se não existir
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['Timestamp', 'Nome', 'Telefone', 'Email', 'Balde', 'Perfil', 'Origem']);
      sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#1d4ed8').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      data.name  || '',
      data.phone || '',
      data.email || '',
      data.balde || '',
      BALDE_LABEL[data.balde] || '',
      'Quiz Imob'
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Permite CORS para chamadas do quiz
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'online' }))
    .setMimeType(ContentService.MimeType.JSON);
}
