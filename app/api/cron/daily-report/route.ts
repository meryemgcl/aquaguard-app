import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  // Verify Cron Secret Token
  if (authHeader !== `Bearer ${process.env.CRON_SECRET_TOKEN}`) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized cron request' },
      { status: 401 }
    );
  }

  // TODO: Trigger daily aggregation / report logic here
  console.log('Daily report cron job executed successfully.');

  return NextResponse.json({
    success: true,
    message: 'Daily report generated',
  });
}
