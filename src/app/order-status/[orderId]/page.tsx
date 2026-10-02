import OrderStatusClient from './components/OrderStatusClient';

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function OrderStatusPage({ params }: Props) {
  const { orderId } = await params;
  return <OrderStatusClient orderId={orderId} />;
}
