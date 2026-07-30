const SHEET_ID   = '1AtBHJjbcl755ZGW_TL6V8QM3pguUDvHJpjizEh4sovw';
const SHEET_NAME = 'Leads';
const BALDE_LABEL = { A:'Filtro', B:'Rastreamento', C:'Velocidade', D:'Origem', E:'Nutrição', X:'Desqualificado' };

function doGet(e) {
  const p = e.parameter;

  // health check (sem parâmetros)
  if (!p.name && !p.phone) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'online' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['Timestamp','Nome','Telefone','Email','Balde','Perfil','Origem']);
      sheet.getRange(1,1,1,7).setFontWeight('bold').setBackground('#1d4ed8').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      p.name  || '',
      p.phone || '',
      p.email || '',
      p.balde || '',
      BALDE_LABEL[p.balde] || '',
      'Quiz Imob'
    ]);

    return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);

  } catch(err) {
    return ContentService.createTextOutput('erro: ' + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}
