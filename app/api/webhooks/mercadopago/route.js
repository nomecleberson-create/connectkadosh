import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/signature';
import { syncPaymentFromMp } from '@/lib/orders';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const dataId = url.searchParams.get('data.id') || body?.data?.id;

  const ok = verifyWebhookSignature({
    xSignature: req.headers.get('x-signature'),
    xRequestId: req.headers.get('x-request-id'),
    dataId: url.searchParams.get('data.id') || body?.data?.id,
    secret: process.env.MP_WEBHOOK_SECRET,
  });
  if (!ok) return NextResponse.json({ error: 'assinatura inválida' }, { status: 401 });

  const type = url.searchParams.get('type') || body?.type;
  if (type !== 'payment' || !dataId) return NextResponse.json({ ignored: true });

  try {
    await syncPaymentFromMp(String(dataId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'falha ao processar' }, { status: 500 }); // MP tenta de novo
  }
}
