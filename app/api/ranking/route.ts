import {getRankingData} from "@/lib/rankingData";


// 변수를 이렇게 설정해놓으면 이 api route를 nodejs 환경에서 실행하겠다는 것임.
// 'edge'로 설정할 수도 있는데, 거의 안씀.
export const runtime = 'nodejs';

// 캐싱하지 않고, 요청이 올때마다 새로 실행하라.
export const dynamic = 'force-dynamic';

// 이렇게 export async function GET()을 만들면 자동으로 /api/ranking 주소의 GET API가 됨.
export async function GET() {
    try {
        const data = await getRankingData();

        // Response.json()은 자바스크립트 객체를 json 응답으로 바꿔줌.
        // ranking은 축약 문법임. ranking: ranking과 같은 뜻.
        return Response.json({
            ok: true,
            players: data.players,
        });
    } catch(error) {
        // error instanceof Error = error가 Error 객체인가? 라는 의미임.
        // 이게 뭔소리냐면, error가 Error 객체이면 error.message를 사용하고,
        // Error 객체가 아니면, String(error)로 문자열로 바꾸라는 의미.
        // 예를 들어, throw new Error("에러 메세지");는 Error 객체이지만, throw 404;는 숫자, throw {message: "에러"};이면 문자
        const message = error instanceof Error ? error.message : String(error);

        // ok: true 일때는 status 기본값이 200임.
        return Response.json({
                ok: false,
                message,
            },
            {
                status: 500,
            });
    }
}

