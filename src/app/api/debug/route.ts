import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const allHeaders: Record<string, string> = {};
  req.headers.forEach((v, k) => { allHeaders[k] = v; });
  
  // Also try to use the X-Token to call the AI API
  const xToken = req.headers.get('x-token') || req.headers.get('X-Token');
  
  let aiTest = 'not tested';
  if (xToken) {
    try {
      const resp = await fetch('http://172.25.136.193:8080/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer Z.ai',
          'X-Z-AI-From': 'Z',
          'X-Token': xToken,
        },
        body: JSON.stringify({
          model: 'glm-4',
          messages: [{role:'assistant',content:'say ok'},{role:'user',content:'test'}],
          max_tokens: 10,
          thinking: {type:'disabled'},
        }),
      });
      const data = await resp.json();
      aiTest = `Status: ${resp.status}, Content: ${data.choices?.[0]?.message?.content || data.error || 'empty'}`;
    } catch(e: any) {
      aiTest = `Error: ${e.message}`;
    }
  }
  
  return NextResponse.json({
    xToken: xToken ? `${xToken.slice(0, 10)}...` : 'NOT PRESENT',
    aiTest,
    allHeaders: Object.keys(allHeaders).filter(k => k.includes('token') || k.includes('auth') || k.includes('x-')),
  });
}
