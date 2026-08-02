import {google} from "googleapis";


//환경변수 편하게 받아오기 위한?
function requireEnv(name: string): string {

    // process.env는 node.js에서 환경변수를 읽는 객체
    const value = process.env[name];

    if (!value) {
        throw new Error(`${name} is missing`);
    }

    return value;
}

export function getSpreadsheetId(envName = 'GOOGLE_SHEET_ID'): string {
    return requireEnv(envName);
}

export function getSheetsClient() {
    const clientEmail = requireEnv('GOOGLE_CLIENT_EMAIL');

    // Vercel 환경변수나 .env.local에 저장하면, 줄바꿈 문자가 실제 줄바꿈이 아니라 "\n" 문자열로 들어갈 수 있어서 바꿔주기
    const privateKey = requireEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');

    //JWT 인증 객체 만들기
    const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    return google.sheets({
        version: 'v4',
        auth,
    })
}
