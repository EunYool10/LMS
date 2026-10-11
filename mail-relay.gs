// TDSNT LMS 메일 발송기 — Google Apps Script (tdshqlms@gmail.com 계정에서 만들고 실행)
// 서버(resetMailer.ts)가 HTTPS로 이 웹 앱을 호출하면 이 계정의 Gmail로 메일을 보냅니다.
// Render 무료 플랜은 SMTP 포트를 막기 때문에 이렇게 보냅니다.
//
// 배포: 배포 → 새 배포 → 유형 "웹 앱", 실행 계정 "나", 액세스 권한 "모든 사용자".
// 웹 앱 주소가 바뀌면 resetMailer.ts의 DEFAULT_RELAY_URL을 고치거나 MAIL_RELAY_URL을 설정합니다.
// SECRET은 서버의 MAIL_RELAY_SECRET과 같은 값이어야 합니다. Render 환경변수에 없으면 resetMailer.ts의
// 봉인된 값(서버만 열 수 있음)을 씁니다. 평문은 저장소에 넣지 않습니다.

const SECRET = 'MAIL_RELAY_SECRET 값을 여기에';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (!SECRET || body.secret !== SECRET) return reply({ ok: false, error: 'forbidden' });
    const to = String(body.to || '');
    if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(to)) return reply({ ok: false, error: 'bad recipient' });
    MailApp.sendEmail(to, String(body.subject || ''), String(body.text || ''), {
      htmlBody: String(body.html || ''),
      name: 'TDSNT LMS 관리팀',
    });
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

// 처음 한 번 실행해 메일 발송 권한을 허용합니다. 오늘 남은 발송 가능 수를 보여 줍니다.
function authorize() {
  Logger.log('오늘 남은 발송 가능 수: ' + MailApp.getRemainingDailyQuota());
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
