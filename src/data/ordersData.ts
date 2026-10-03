export type OrderStatus =
  | 'pending' |'confirmed' |'packaging' |'enroute' |'delivered' |'pickup' |'cancelled';

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  status: OrderStatus;
  type: 'delivery' | 'pickup';
  placedAt: string;
  scheduledFor?: string | null;
  fulfillmentTimezone?: string | null;
  notes: string;
}

export const mockOrders: Order[] = [
  {
    id: 'LB-2245',
    customerName: 'Sofia Ramirez',
    customerPhone: '(305) 555-0141',
    customerAddress: '1200 Brickell Ave, Apt 14B, Miami FL 33131',
    items: [
      { name: 'Reina Pepiada Arepa', qty: 2, price: 9.5 },
      { name: 'Classic Tequeños (6pc)', qty: 1, price: 7.0 },
    ],
    subtotal: 26.0,
    deliveryFee: 3.5,
    tax: 2.36,
    total: 31.86,
    status: 'pending',
    type: 'delivery',
    placedAt: '9:14 AM',
    notes: 'Ring buzzer #14B. Leave at door if no answer.',
  },
  {
    id: 'LB-2244',
    customerName: 'Valentina Castro',
    customerPhone: '(786) 555-0228',
    customerAddress: '890 SW 8th St, Miami FL 33130',
    items: [
      { name: 'Custom Sweet Box (6 treats)', qty: 1, price: 42.5 },
    ],
    subtotal: 42.5,
    deliveryFee: 3.5,
    tax: 3.68,
    total: 49.68,
    status: 'confirmed',
    type: 'delivery',
    placedAt: '8:51 AM',
    notes: 'Gift — please include a note: Happy Birthday Abuela!',
  },
  {
    id: 'LB-2243',
    customerName: 'Diego Fernandez',
    customerPhone: '(305) 555-0317',
    customerAddress: 'Pickup',
    items: [
      { name: 'Pabellón Arepa', qty: 1, price: 10.5 },
      { name: 'Beef & Potato Empanada', qty: 2, price: 5.5 },
    ],
    subtotal: 21.5,
    deliveryFee: 0,
    tax: 1.72,
    total: 23.22,
    status: 'packaging',
    type: 'pickup',
    placedAt: '8:40 AM',
    notes: '',
  },
  {
    id: 'LB-2242',
    customerName: 'Isabella Torres',
    customerPhone: '(305) 555-0489',
    customerAddress: '456 NW 2nd Ave, Miami FL 33128',
    items: [
      { name: 'Pabellón Patacón', qty: 1, price: 12.0 },
      { name: 'Cheese & Jalapeño Empanada', qty: 2, price: 5.0 },
      { name: 'Bienmesabe Cup', qty: 1, price: 4.5 },
    ],
    subtotal: 26.5,
    deliveryFee: 3.5,
    tax: 2.4,
    total: 32.4,
    status: 'enroute',
    type: 'delivery',
    placedAt: '8:28 AM',
    notes: 'Apartment on 4th floor, elevator available.',
  },
  {
    id: 'LB-2241',
    customerName: 'Carlos Mendoza',
    customerPhone: '(786) 555-0562',
    customerAddress: '200 Biscayne Blvd, Miami FL 33132',
    items: [
      { name: 'Reina Pepiada Arepa', qty: 1, price: 9.5 },
      { name: 'Classic Cachapa', qty: 1, price: 8.0 },
    ],
    subtotal: 17.5,
    deliveryFee: 3.5,
    tax: 1.68,
    total: 22.68,
    status: 'delivered',
    type: 'delivery',
    placedAt: '7:55 AM',
    notes: '',
  },
  {
    id: 'LB-2240',
    customerName: 'Ana Perez',
    customerPhone: '(305) 555-0633',
    customerAddress: '3100 NE 1st Ave, Miami FL 33137',
    items: [
      { name: 'Pelúa Arepa', qty: 2, price: 10.0 },
      { name: 'Beef & Potato Empanada', qty: 3, price: 5.5 },
    ],
    subtotal: 36.5,
    deliveryFee: 3.5,
    tax: 3.2,
    total: 43.2,
    status: 'delivered',
    type: 'delivery',
    placedAt: '7:30 AM',
    notes: '',
  },
  {
    id: 'LB-2239',
    customerName: 'Miguel Suarez',
    customerPhone: '(786) 555-0744',
    customerAddress: 'Pickup',
    items: [
      { name: 'Domino Arepa', qty: 2, price: 8.5 },
      { name: 'Nutella Tequeños (4pc)', qty: 1, price: 7.5 },
    ],
    subtotal: 24.5,
    deliveryFee: 0,
    tax: 1.96,
    total: 26.46,
    status: 'pickup',
    type: 'pickup',
    placedAt: '7:15 AM',
    notes: 'Coming around 10 AM.',
  },
  {
    id: 'LB-2238',
    customerName: 'Gabriela Vega',
    customerPhone: '(305) 555-0821',
    customerAddress: '1800 Coral Way, Miami FL 33145',
    items: [
      { name: 'Chicken & Avocado Patacón', qty: 1, price: 11.5 },
      { name: 'Quesillo Slice', qty: 2, price: 5.0 },
    ],
    subtotal: 21.5,
    deliveryFee: 3.5,
    tax: 2.0,
    total: 27.0,
    status: 'confirmed',
    type: 'delivery',
    placedAt: '7:02 AM',
    notes: 'Allergic to nuts — please confirm no cross-contamination.',
  },
  {
    id: 'LB-2237',
    customerName: 'Roberto Blanco',
    customerPhone: '(786) 555-0915',
    customerAddress: '750 SW 27th Ave, Miami FL 33135',
    items: [
      { name: 'Reina Pepiada Arepa', qty: 3, price: 9.5 },
      { name: 'Classic Tequeños (6pc)', qty: 2, price: 7.0 },
    ],
    subtotal: 42.5,
    deliveryFee: 3.5,
    tax: 3.68,
    total: 49.68,
    status: 'delivered',
    type: 'delivery',
    placedAt: '6:45 AM',
    notes: '',
  },
  {
    id: 'LB-2236',
    customerName: 'Lucia Morales',
    customerPhone: '(305) 555-1002',
    customerAddress: 'Pickup',
    items: [
      { name: 'Shrimp & Cilantro Empanada', qty: 4, price: 6.5 },
      { name: 'Classic Cachapa', qty: 1, price: 8.0 },
    ],
    subtotal: 34.0,
    deliveryFee: 0,
    tax: 2.72,
    total: 36.72,
    status: 'delivered',
    type: 'pickup',
    placedAt: '6:30 AM',
    notes: '',
  },
];