export interface MenuItem {
  id: string;
  name: string;
  category: 'arepa' | 'empanada' | 'patacon' | 'cachapa' | 'tequeno' | 'sweet';
  price: number;
  description: string;
  image: string;
  alt: string;
  available: boolean;
  popular: boolean;
  badges: string[];
  calories?: number;
}

export const menuItems: MenuItem[] = [
{
  id: 'arepa-001',
  name: 'Reina Pepiada',
  category: 'arepa',
  price: 9.5,
  description: 'Classic arepa filled with creamy chicken and avocado salad. A Venezuelan icon.',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_16460d06b-1773095810884.png",
  alt: 'Golden arepa filled with creamy chicken avocado salad on a wooden board',
  available: true,
  popular: true,
  badges: ['Fan Fave', '⭐ Best Seller'],
  calories: 420
},
{
  id: 'arepa-002',
  name: 'Pabellón Arepa',
  category: 'arepa',
  price: 10.5,
  description: 'Loaded with shredded beef, black beans, sweet plantains, and white cheese.',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_125685a43-1772058237094.png",
  alt: 'Stuffed arepa overflowing with shredded beef black beans and sweet plantains',
  available: true,
  popular: true,
  badges: ['💪 Hearty'],
  calories: 580
},
{
  id: 'arepa-003',
  name: 'Pelúa Arepa',
  category: 'arepa',
  price: 10.0,
  description: 'Shredded beef and melted yellow cheese — the "hairy" arepa loved by all.',
  image: "https://images.unsplash.com/photo-1526431716035-f242667a1c42",
  alt: 'Arepa split open showing shredded beef and melted yellow cheese filling',
  available: true,
  popular: false,
  badges: ['🧀 Cheesy'],
  calories: 510
},
{
  id: 'arepa-004',
  name: 'Domino Arepa',
  category: 'arepa',
  price: 8.5,
  description: 'Black beans and white queso fresco — simple, satisfying, and totally Venezuelan.',
  image: "https://images.unsplash.com/photo-1632370382707-dcd0ec55d0ab",
  alt: 'Arepa filled with black beans and white fresh cheese on a pink plate',
  available: true,
  popular: false,
  badges: ['🌱 Veggie'],
  calories: 360
},
{
  id: 'empanada-001',
  name: 'Beef & Potato Empanada',
  category: 'empanada',
  price: 5.5,
  description: 'Crispy fried corn dough pocket filled with seasoned ground beef and potatoes.',
  image: "https://images.unsplash.com/photo-1707080032705-ec2df78fd395",
  alt: 'Golden crispy empanada on parchment paper with a side of pink sauce',
  available: true,
  popular: true,
  badges: ['⭐ Best Seller'],
  calories: 310
},
{
  id: 'empanada-002',
  name: 'Cheese & Jalapeño Empanada',
  category: 'empanada',
  price: 5.0,
  description: 'Melty white cheese with a gentle jalapeño kick. Vegetarian-friendly.',
  image: "https://images.unsplash.com/photo-1722982971548-8ddb57b64b1e",
  alt: 'Empanada cut in half showing melted cheese and green jalapeño filling',
  available: true,
  popular: false,
  badges: ['🌱 Veggie', '🔥 Spicy'],
  calories: 280
},
{
  id: 'empanada-003',
  name: 'Shrimp & Cilantro Empanada',
  category: 'empanada',
  price: 6.5,
  description: 'Plump shrimp with garlic, cilantro, and a squeeze of lime inside crispy corn dough.',
  image: "https://images.unsplash.com/photo-1548228586-171fb0887ac0",
  alt: 'Shrimp empanada garnished with fresh cilantro on a wooden serving board',
  available: true,
  popular: false,
  badges: ['🦐 Seafood'],
  calories: 295
},
{
  id: 'patacon-001',
  name: 'Pabellón Patacón',
  category: 'patacon',
  price: 12.0,
  description: 'Crispy twice-fried green plantain "bun" loaded with shredded beef, black beans, and cheese.',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1c531bb93-1765291114488.png",
  alt: 'Patacon sandwich made from fried plantains filled with shredded beef and black beans',
  available: true,
  popular: true,
  badges: ['⭐ Best Seller', '🍌 Plantain'],
  calories: 650
},
{
  id: 'patacon-002',
  name: 'Chicken & Avocado Patacón',
  category: 'patacon',
  price: 11.5,
  description: 'Smoky grilled chicken, creamy avocado slices, and garlic mayo between two golden plantain discs.',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1e50f7f5a-1772818698896.png",
  alt: 'Patacon sandwich with grilled chicken avocado and garlic mayo on a colorful plate',
  available: true,
  popular: false,
  badges: ['🥑 Avocado'],
  calories: 590
},
{
  id: 'cachapa-001',
  name: 'Classic Cachapa',
  category: 'cachapa',
  price: 8.0,
  description: 'Sweet fresh corn pancake folded over hand-pulled mozzarella. Comfort in every bite.',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_154ecb8da-1772058235093.png",
  alt: 'Golden sweet corn cachapa folded over white fresh cheese on a rustic plate',
  available: true,
  popular: true,
  badges: ['🌽 Sweet Corn'],
  calories: 420
},
{
  id: 'cachapa-002',
  name: 'Cachapa con Pernil',
  category: 'cachapa',
  price: 11.0,
  description: 'Sweet corn pancake with slow-roasted pulled pork and queso de mano.',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1287547ce-1772058237100.png",
  alt: 'Cachapa with slow-roasted pork and fresh white cheese on a colorful ceramic plate',
  available: false,
  popular: false,
  badges: ['🐷 Pernil', '🔜 Back Soon'],
  calories: 560
},
{
  id: 'tequeno-001',
  name: 'Classic Tequeños (6pc)',
  category: 'tequeno',
  price: 7.0,
  description: 'Six golden fried cheese sticks made with queso blanco wrapped in dough. Irresistible.',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_125c7fa97-1772058236283.png",
  alt: 'Six golden fried tequeños cheese sticks arranged on a pink plate with dipping sauce',
  available: true,
  popular: true,
  badges: ['⭐ Best Seller', '🎉 Party Fave'],
  calories: 380
},
{
  id: 'tequeno-002',
  name: 'Nutella Tequeños (4pc)',
  category: 'tequeno',
  price: 7.5,
  description: 'Sweet fried dough filled with Nutella and dusted with powdered sugar. Pure joy.',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_46385b5a2-1789982806650.png",
  alt: 'Four sweet tequeños dusted with powdered sugar with Nutella oozing out',
  available: true,
  popular: false,
  badges: ['🍫 Sweet', '✨ New'],
  calories: 340
},
{
  id: 'sweet-001',
  name: 'Bienmesabe Cup',
  category: 'sweet',
  price: 4.5,
  description: 'Traditional Venezuelan coconut cream dessert, served chilled with a sprinkle of cinnamon.',
  image: "https://images.unsplash.com/photo-1494537649270-44355997d3e3",
  alt: 'Creamy coconut bienmesabe served in a small cup with cinnamon on top',
  available: true,
  popular: false,
  badges: ['🥥 Traditional'],
  calories: 210
},
{
  id: 'sweet-002',
  name: 'Quesillo Slice',
  category: 'sweet',
  price: 5.0,
  description: 'Venezuelan-style flan with caramel sauce — dense, creamy, and dreamy.',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_141ceddb0-1765232175619.png",
  alt: 'Slice of Venezuelan quesillo flan with golden caramel sauce on a white plate',
  available: true,
  popular: true,
  badges: ['🍮 Flan', '⭐ Best Seller'],
  calories: 280
}];


export const categories = [
{ id: 'all', label: 'All Dishes', emoji: '🍽️' },
{ id: 'arepa', label: 'Arepas', emoji: '🫓' },
{ id: 'empanada', label: 'Empanadas', emoji: '🥟' },
{ id: 'patacon', label: 'Patacones', emoji: '🍌' },
{ id: 'cachapa', label: 'Cachapas', emoji: '🌽' },
{ id: 'tequeno', label: 'Tequeños', emoji: '🧀' },
{ id: 'sweet', label: 'Sweets', emoji: '🍮' }];