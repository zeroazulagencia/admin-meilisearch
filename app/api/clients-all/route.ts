import { NextResponse } from 'next/server';
import { query } from '@/utils/db';

export async function GET() {
  try {
    const result1: any = await query(
      'SELECT id, name, email, phone, company, permissions, status FROM clients ORDER BY id'
    );
    const clients = Array.isArray(result1) ? result1[0] : result1;

    const result2: any = await query(
      "SELECT id, client_id, name, description, photo, status, monthly_value_usd FROM agents WHERE monthly_value_usd IS NOT NULL AND monthly_value_usd > 0 ORDER BY client_id"
    );
    const agentsList = Array.isArray(result2) ? result2[0] : result2;

    const agentsByClient = new Map<number, Array<{id: number; name: string; photo: string | null; monthly_value_usd: number}>>();
    for (const agent of agentsList || []) {
      const cid = parseInt(String(agent.client_id || 0));
      if (!agentsByClient.has(cid)) agentsByClient.set(cid, []);
      const list = agentsByClient.get(cid)!;
      list.push({
        id: agent.id,
        name: agent.name,
        photo: agent.photo,
        monthly_value_usd: parseFloat(String(agent.monthly_value_usd || 0))
      });
    }

    const result = (clients || []).map((client: any) => {
      const cAgents = agentsByClient.get(client.id) || [];
      const totalMonthlyValue = cAgents.reduce((s: number, a: any) => s + (a.monthly_value_usd || 0), 0);
      return {
        ...client,
        agents: cAgents,
        totalMonthlyValue
      };
    });

    return NextResponse.json({ ok: true, clients: result });
  } catch (e: any) {
    console.error('clients-all error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}
