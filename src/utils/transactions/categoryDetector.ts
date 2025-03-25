
/**
 * Determines transaction category based on keywords in the description
 */
export function determineCategory(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  // Dining/Restaurants
  if (lowerDesc.includes('restaurant') || lowerDesc.includes('cafe') || lowerDesc.includes('coffee') || 
      lowerDesc.includes('pizza') || lowerDesc.includes('mcdonalds') || lowerDesc.includes('starbucks') ||
      lowerDesc.includes('dining') || lowerDesc.includes('doordash') || lowerDesc.includes('grubhub') ||
      lowerDesc.includes('uber eat') || lowerDesc.includes('taco') || lowerDesc.includes('burger') ||
      lowerDesc.includes('ihop') || lowerDesc.includes('subway') || lowerDesc.includes('steakhouse') ||
      lowerDesc.includes('diner') || lowerDesc.includes('chipotle') || lowerDesc.includes('bbq') ||
      lowerDesc.includes('sushi') || lowerDesc.includes('food') || lowerDesc.includes('bakery') ||
      lowerDesc.includes('tst*') || lowerDesc.includes('whiskey') || lowerDesc.includes('panda express') ||
      lowerDesc.includes('aramark') || lowerDesc.includes('earl') || lowerDesc.includes('haywire') ||
      lowerDesc.includes('haystacks') || lowerDesc.includes('kyoto') || lowerDesc.includes('hideaway') ||
      lowerDesc.includes('mcdonald') || lowerDesc.includes('pokeworks') || lowerDesc.includes('salad and go')) {
    return 'Dining';
  }
  
  // Groceries
  if (lowerDesc.includes('grocery') || lowerDesc.includes('market') || lowerDesc.includes('supermarket') || 
      lowerDesc.includes('walmart') || lowerDesc.includes('target') || lowerDesc.includes('safeway') ||
      lowerDesc.includes('kroger') || lowerDesc.includes('trader') || lowerDesc.includes('whole foods') ||
      lowerDesc.includes('aldi') || lowerDesc.includes('heb') || lowerDesc.includes('publix') ||
      lowerDesc.includes('costco') || lowerDesc.includes('sam\'s club') || lowerDesc.includes('food lion') ||
      lowerDesc.includes('sprouts')) {
    return 'Groceries';
  }
  
  // Transportation
  if (lowerDesc.includes('gas') || lowerDesc.includes('fuel') || lowerDesc.includes('uber') || 
      lowerDesc.includes('lyft') || lowerDesc.includes('transit') || lowerDesc.includes('parking') ||
      lowerDesc.includes('taxi') || lowerDesc.includes('toll') || lowerDesc.includes('metro') ||
      lowerDesc.includes('train') || lowerDesc.includes('airline') || lowerDesc.includes('air') ||
      lowerDesc.includes('flight') || lowerDesc.includes('delta') || lowerDesc.includes('united') ||
      lowerDesc.includes('american air') || lowerDesc.includes('southwest') || lowerDesc.includes('exxon') ||
      lowerDesc.includes('shell') || lowerDesc.includes('chevron') || lowerDesc.includes('76') ||
      lowerDesc.includes('marathon') || lowerDesc.includes('speedway') || lowerDesc.includes('bp') ||
      lowerDesc.includes('tesla supercharger') || lowerDesc.includes('ntta') || lowerDesc.includes('tiger mart') ||
      lowerDesc.includes('racetrac') || lowerDesc.includes('7-eleven') || lowerDesc.includes('7-11') ||
      lowerDesc.includes('spirit air') || lowerDesc.includes('modest rides')) {
    return 'Transportation';
  }
  
  // Income
  if (lowerDesc.includes('salary') || lowerDesc.includes('direct dep') || lowerDesc.includes('payroll') ||
      lowerDesc.includes('deposit from') || lowerDesc.includes('ach deposit') || lowerDesc.includes('income') ||
      lowerDesc.includes('tax refund') || lowerDesc.includes('interest paid') || lowerDesc.includes('dividend')) {
    return 'Income';
  }
  
  // Bills & Utilities
  if (lowerDesc.includes('bill') || lowerDesc.includes('utility') || lowerDesc.includes('phone') || 
      lowerDesc.includes('cable') || lowerDesc.includes('electric') || lowerDesc.includes('water') ||
      lowerDesc.includes('gas bill') || lowerDesc.includes('internet') || lowerDesc.includes('wireless') ||
      lowerDesc.includes('netflix') || lowerDesc.includes('spotify') || lowerDesc.includes('hulu') ||
      lowerDesc.includes('insurance') || lowerDesc.includes('at&t') || lowerDesc.includes('verizon') ||
      lowerDesc.includes('t-mobile') || lowerDesc.includes('comcast') || lowerDesc.includes('xfinity') ||
      lowerDesc.includes('google') || lowerDesc.includes('nest') || lowerDesc.includes('atmos energy') ||
      lowerDesc.includes('openai') || lowerDesc.includes('chatgpt') || lowerDesc.includes('utilities')) {
    return 'Bills';
  }
  
  // Shopping
  if (lowerDesc.includes('amazon') || lowerDesc.includes('online') || lowerDesc.includes('shop') || 
      lowerDesc.includes('store') || lowerDesc.includes('best buy') || lowerDesc.includes('purchase') ||
      lowerDesc.includes('ebay') || lowerDesc.includes('etsy') || lowerDesc.includes('wayfair') ||
      lowerDesc.includes('home depot') || lowerDesc.includes('lowe\'s') || lowerDesc.includes('ikea') ||
      lowerDesc.includes('apple') || lowerDesc.includes('clothing') || lowerDesc.includes('shoes') ||
      lowerDesc.includes('fashion') || lowerDesc.includes('mall') || lowerDesc.includes('retail') ||
      lowerDesc.includes('walmart') || lowerDesc.includes('target') || lowerDesc.includes('chewy') ||
      lowerDesc.includes('petco') || lowerDesc.includes('scheels') || lowerDesc.includes('wild fork') ||
      lowerDesc.includes('hallmark')) {
    return 'Shopping';
  }
  
  // Cash & ATM
  if (lowerDesc.includes('withdraw') || lowerDesc.includes('atm') || lowerDesc.includes('cash') ||
      lowerDesc.includes('withdrawal')) {
    return 'Cash';
  }
  
  // Transfers
  if (lowerDesc.includes('transfer') || lowerDesc.includes('zelle') || lowerDesc.includes('venmo') ||
      lowerDesc.includes('paypal') || lowerDesc.includes('send money') || lowerDesc.includes('wire') ||
      lowerDesc.includes('chase quickpay') || lowerDesc.includes('cashapp') || lowerDesc.includes('square cash')) {
    return 'Transfer';
  }
  
  // Fees & Interest
  if (lowerDesc.includes('fee') || lowerDesc.includes('interest') || lowerDesc.includes('service charge') ||
      lowerDesc.includes('membership fee') || lowerDesc.includes('annual fee') || lowerDesc.includes('late fee') ||
      lowerDesc.includes('finance charge') || lowerDesc.includes('balance transfer fee')) {
    return 'Fees';
  }
  
  // Health
  if (lowerDesc.includes('doctor') || lowerDesc.includes('hospital') || lowerDesc.includes('clinic') ||
      lowerDesc.includes('pharmacy') || lowerDesc.includes('medical') || lowerDesc.includes('dental') ||
      lowerDesc.includes('healthcare') || lowerDesc.includes('vision') || lowerDesc.includes('cvs') ||
      lowerDesc.includes('walgreens') || lowerDesc.includes('rite aid') || lowerDesc.includes('rx')) {
    return 'Health';
  }
  
  // Entertainment
  if (lowerDesc.includes('movie') || lowerDesc.includes('theater') || lowerDesc.includes('cinema') ||
      lowerDesc.includes('ticket') || lowerDesc.includes('event') || lowerDesc.includes('concert') ||
      lowerDesc.includes('disney') || lowerDesc.includes('netflix') || lowerDesc.includes('hulu') ||
      lowerDesc.includes('spotify') || lowerDesc.includes('amazon prime') || lowerDesc.includes('hbo') ||
      lowerDesc.includes('stubhub') || lowerDesc.includes('cosmopolitan') || lowerDesc.includes('cosm') ||
      lowerDesc.includes('ticketmaster') || lowerDesc.includes('ticketing')) {
    return 'Entertainment';
  }
  
  // Payments
  if (lowerDesc.includes('payment thank') || lowerDesc.includes('autopay') || lowerDesc.includes('bill pay') ||
      lowerDesc.includes('payment - thank') || lowerDesc.includes('automatic payment')) {
    return 'Payment';
  }
  
  // Fitness
  if (lowerDesc.includes('gym') || lowerDesc.includes('fitness') || lowerDesc.includes('la fitness') ||
      lowerDesc.includes('planet fitness') || lowerDesc.includes('equinox') || lowerDesc.includes('workout') ||
      lowerDesc.includes('crossfit') || lowerDesc.includes('yoga')) {
    return 'Fitness';
  }
  
  // Home
  if (lowerDesc.includes('home depot') || lowerDesc.includes('lowe\'s') || lowerDesc.includes('furniture') ||
      lowerDesc.includes('appliance') || lowerDesc.includes('repair') || lowerDesc.includes('gardening') ||
      lowerDesc.includes('cleaning') || lowerDesc.includes('homegoods') || lowerDesc.includes('bed bath') ||
      lowerDesc.includes('mattress') || lowerDesc.includes('hardware') || lowerDesc.includes('decor')) {
    return 'Home';
  }
  
  // Personal Care
  if (lowerDesc.includes('salon') || lowerDesc.includes('spa') || lowerDesc.includes('barber') ||
      lowerDesc.includes('haircut') || lowerDesc.includes('manicure') || lowerDesc.includes('pedicure') ||
      lowerDesc.includes('massage') || lowerDesc.includes('beauty') || lowerDesc.includes('cosmetics') ||
      lowerDesc.includes('sephora') || lowerDesc.includes('ulta') || lowerDesc.includes('boardroom')) {
    return 'Personal Care';
  }
  
  // Clothing
  if (lowerDesc.includes('clothing') || lowerDesc.includes('apparel') || lowerDesc.includes('fashion') ||
      lowerDesc.includes('shoes') || lowerDesc.includes('sneaker') || lowerDesc.includes('nike') ||
      lowerDesc.includes('adidas') || lowerDesc.includes('h&m') || lowerDesc.includes('zara') ||
      lowerDesc.includes('macy') || lowerDesc.includes('nordstrom') || lowerDesc.includes('gap') ||
      lowerDesc.includes('old navy') || lowerDesc.includes('american eagle') || lowerDesc.includes('cleaners')) {
    return 'Clothing';
  }
  
  // Return 'Other' for any unmatched descriptions
  return 'Other';
}
