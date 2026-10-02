import AdminLayout from '@/components/AdminLayout';
import InventoryClient from './components/InventoryClient';

export default function InventoryPage() {
  return (
    <AdminLayout title="Inventory & Stock">
      <InventoryClient />
    </AdminLayout>
  );
}
