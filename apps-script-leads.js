// ── CORE MKT — Apps Script · Dashboard Data Collector ───────────────────────
// Sheet ID: 1AtBHJjbcl755ZGW_TL6V8QM3pguUDvHJpjizEh4sovw
//
// Como atualizar: Apps Script → salvar → Gerenciar implantações → lápis →
//   Nova versão → Implantar (a URL fica a mesma)
//
// A planilha NÃO precisa ser pública — os dados são servidos pelo próprio
// Apps Script com JSONP, funcionando a partir de qualquer origem.
// ─────────────────────────────────────────────────────────────────────────────

const SHEET_ID = '1AtBHJjbcl755ZGW_TL6V8QM3pguUDvHJpjizEh4sovw';

const BALDE_LABEL = {
  A: 'Filtro',
  B: 'Rastreamento',
  C: 'Velocidade',
  D: 'Origem',
  E: 'Nutrição',
  X: 'Desqualificado'
};

function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1d4ed8')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doGet(e) {
  const p = e.parameter;

  // health check
  if (!p.type) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'online' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // ── exportar dados para o dashboard (JSONP) ─────────────────────────────
    if (p.type === 'export') {
      const sheetName = p.sheet === 'leads' ? 'Leads' : 'Eventos';
      const sheet     = ss.getSheetByName(sheetName);
      let result;

      if (!sheet) {
        result = JSON.stringify({ headers: [], rows: [] });
      } else {
        const vals    = sheet.getDataRange().getValues();
        const headers = vals[0] || [];
        const rows    = vals.slice(1).map(row => {
          const obj = {};
          headers.forEach((h, i) => { obj[h] = (row[i] !== undefined && row[i] !== '') ? String(row[i]) : ''; });
          return obj;
        });
        result = JSON.stringify({ headers, rows });
      }

      // JSONP quando há callback, JSON puro caso contrário
      if (p.cb) {
        return ContentService
          .createTextOutput(p.cb + '(' + result + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
    }

    const ts = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // ── evento de funil ─────────────────────────────────────────────────────
    if (p.type === 'event') {
      const sheet = ensureSheet(ss, 'Eventos', [
        'Timestamp', 'SessionID', 'QuizID', 'Step', 'StepIndex'
      ]);
      sheet.appendRow([
        ts,
        p.sid  || '',
        p.qid  || '',
        p.step || '',
        isNaN(parseInt(p.idx)) ? '' : parseInt(p.idx)
      ]);
    }

    // ── lead completo ───────────────────────────────────────────────────────
    if (p.type === 'lead') {
      const sheet = ensureSheet(ss, 'Leads', [
        'Timestamp', 'SessionID', 'QuizID',
        'Nome', 'Telefone', 'Email', 'Balde', 'BaldeLabel',
        'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9'
      ]);
      const qi = (n) => (p['q'+n] !== undefined && p['q'+n] !== '') ? parseInt(p['q'+n]) : '';
      sheet.appendRow([
        ts,
        p.sid   || '',
        p.qid   || '',
        p.name  || '',
        p.phone || '',
        p.email || '',
        p.balde || '',
        BALDE_LABEL[p.balde] || '',
        qi(1), qi(2), qi(3), qi(4), qi(5), qi(6), qi(7), qi(8), qi(9)
      ]);
    }

    return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    const errJson = JSON.stringify({ error: err.message });
    if (p.cb) {
      return ContentService.createTextOutput(p.cb + '(' + errJson + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput('erro: ' + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}
