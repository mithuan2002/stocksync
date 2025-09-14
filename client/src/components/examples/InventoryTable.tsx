import { InventoryTable } from '../InventoryTable';
import { Product } from '@shared/schema';

export default function InventoryTableExample() {
  // todo: remove mock functionality - sample products for demonstration
  const mockProducts: Product[] = [
    {
      id: '1',
      sku: 'WH-001',
      productName: 'Wireless Headphones Pro',
      channels: [
        { channel: 'Amazon', quantity: 25 },
        { channel: 'Shopify', quantity: 15 }
      ],
      totalQuantity: 40,
      lowStockThreshold: 20,
      isLowStock: false
    },
    {
      id: '2',
      sku: 'SC-002',
      productName: 'Smartphone Case Premium',
      channels: [
        { channel: 'Amazon', quantity: 5 },
        { channel: 'Shopify', quantity: 3 }
      ],
      totalQuantity: 8,
      lowStockThreshold: 15,
      isLowStock: true
    },
    {
      id: '3',
      sku: 'BT-003',
      productName: 'Bluetooth Speaker Mini',
      channels: [
        { channel: 'Amazon', quantity: 50 },
        { channel: 'Shopify', quantity: 30 }
      ],
      totalQuantity: 80,
      lowStockThreshold: 25,
      isLowStock: false
    },
    {
      id: '4',
      sku: 'UC-004',
      productName: 'USB-C Cable 6ft',
      channels: [
        { channel: 'Amazon', quantity: 2 },
        { channel: 'Shopify', quantity: 1 }
      ],
      totalQuantity: 3,
      lowStockThreshold: 10,
      isLowStock: true
    }
  ];

  const handleExport = () => {
    console.log('Exporting inventory report...');
  };

  return <InventoryTable products={mockProducts} onExport={handleExport} />;
}