export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: "Burgers" | "Sandwiches" | "Sides" | "Drinks";
  description: string;
  kcal: number;
  tag?: "TOP" | "HOT";
  customization?: {
    included: string[];
    holdable: string[];
    extras: { name: string; price: number }[];
    prompt: string;
  };
};

export const MENU: MenuItem[] = [
  {
    id: "classic",
    name: "Classic Smash",
    price: 9.5,
    category: "Burgers",
    kcal: 540,
    tag: "TOP",
    description: "Two thin-pressed patties, American, secret sauce, pickles, brioche.",
    customization: {
      included: ["American cheese", "secret sauce", "pickles", "onion", "brioche bun"],
      holdable: ["American cheese", "secret sauce", "pickles", "onion"],
      extras: [
        { name: "bacon", price: 2.5 },
        { name: "extra patty", price: 3 },
        { name: "extra cheese", price: 1 },
        { name: "avocado", price: 2 }
      ],
      prompt: "Want it as-is, or any changes like sauce, cheese, onions, or pickles?"
    }
  },
  {
    id: "double",
    name: "Double Stack",
    price: 13,
    category: "Burgers",
    kcal: 820,
    description: "Four patties, double cheese. Built for ambition.",
    customization: {
      included: ["American cheese", "secret sauce", "pickles", "onion", "brioche bun"],
      holdable: ["American cheese", "secret sauce", "pickles", "onion"],
      extras: [
        { name: "bacon", price: 2.5 },
        { name: "extra patty", price: 3 },
        { name: "extra cheese", price: 1 },
        { name: "avocado", price: 2 }
      ],
      prompt: "Any changes to the cheese, sauce, onions, or pickles?"
    }
  },
  {
    id: "spicy",
    name: "Spicy Chicken Sando",
    price: 11,
    category: "Sandwiches",
    kcal: 620,
    tag: "HOT",
    description: "Buttermilk-fried chicken, chili crunch, slaw, lime aioli.",
    customization: {
      included: ["buttermilk chicken", "chili crunch", "slaw", "lime aioli", "milk bun"],
      holdable: ["chili crunch", "slaw", "lime aioli"],
      extras: [
        { name: "American cheese", price: 1 },
        { name: "bacon", price: 2.5 },
        { name: "extra chili crunch", price: 0.75 },
        { name: "extra slaw", price: 1 }
      ],
      prompt: "Want it as-is, or tweak the heat, slaw, or aioli?"
    }
  },
  {
    id: "fish",
    name: "Crispy Fish Roll",
    price: 12,
    category: "Sandwiches",
    kcal: 580,
    description: "Beer-battered cod, tartare, dill pickles, soft milk bun.",
    customization: {
      included: ["beer-battered cod", "tartare", "dill pickles", "lettuce", "milk bun"],
      holdable: ["tartare", "dill pickles", "lettuce"],
      extras: [
        { name: "extra tartare", price: 0.75 },
        { name: "American cheese", price: 1 },
        { name: "slaw", price: 1 }
      ],
      prompt: "Any changes to the tartare, dill pickles, or lettuce?"
    }
  },
  {
    id: "fries",
    name: "Crinkle Fries",
    price: 4.5,
    category: "Sides",
    kcal: 320,
    description: "Skin-on, salted, crispy edges.",
    customization: {
      included: ["salt"],
      holdable: ["salt"],
      extras: [
        { name: "cheese sauce", price: 1.5 },
        { name: "secret sauce", price: 0.75 },
        { name: "chili crunch", price: 0.75 }
      ],
      prompt: "Want them salted as usual, or add a sauce?"
    }
  },
  {
    id: "rings",
    name: "Onion Rings",
    price: 5,
    category: "Sides",
    kcal: 380,
    description: "Thick-cut, beer-battered, smoked paprika dip.",
    customization: {
      included: ["smoked paprika dip"],
      holdable: ["smoked paprika dip"],
      extras: [
        { name: "extra paprika dip", price: 0.75 },
        { name: "ranch", price: 0.75 },
        { name: "secret sauce", price: 0.75 }
      ],
      prompt: "Paprika dip on the side okay, or add another sauce?"
    }
  },
  {
    id: "shake",
    name: "Strawberry Shake",
    price: 6,
    category: "Drinks",
    kcal: 510,
    description: "Real berries, vanilla soft-serve.",
    customization: {
      included: ["strawberry", "vanilla soft-serve", "whipped cream"],
      holdable: ["whipped cream"],
      extras: [
        { name: "extra strawberry", price: 1 },
        { name: "malt", price: 0.75 }
      ],
      prompt: "Whipped cream okay, or make it malted?"
    }
  },
  {
    id: "cola",
    name: "Cherry Cola",
    price: 3.5,
    category: "Drinks",
    kcal: 180,
    description: "House-made syrup, fizzy, served cold.",
    customization: {
      included: ["cherry syrup", "ice"],
      holdable: ["ice", "cherry syrup"],
      extras: [
        { name: "extra ice", price: 0 },
        { name: "extra cherry syrup", price: 0.5 }
      ],
      prompt: "Regular ice and cherry syrup okay?"
    }
  },
  // ── More Burgers ─────────────────────────────────────────────────────
  {
    id: "bbq",
    name: "BBQ Bacon Burger",
    price: 11.5,
    category: "Burgers",
    kcal: 720,
    description: "Smashed patty, crispy bacon, smoky BBQ sauce, cheddar, brioche.",
    customization: {
      included: ["bacon", "BBQ sauce", "cheddar", "onion", "pickles", "brioche bun"],
      holdable: ["bacon", "BBQ sauce", "cheddar", "onion", "pickles"],
      extras: [
        { name: "extra bacon", price: 2 },
        { name: "jalapeños", price: 0.75 },
        { name: "avocado", price: 2 }
      ],
      prompt: "Want it as-is, or hold the bacon, onion, or pickles?"
    }
  },
  {
    id: "mushroom",
    name: "Mushroom Swiss",
    price: 12,
    category: "Burgers",
    kcal: 660,
    description: "Buttery sautéed mushrooms, Swiss, caramelized onions, brioche.",
    customization: {
      included: ["mushrooms", "Swiss cheese", "caramelized onions", "brioche bun"],
      holdable: ["mushrooms", "Swiss cheese", "caramelized onions"],
      extras: [
        { name: "bacon", price: 2.5 },
        { name: "extra cheese", price: 1 },
        { name: "truffle aioli", price: 1.5 }
      ],
      prompt: "Any swaps on the mushrooms, onions, or cheese?"
    }
  },
  {
    id: "garden",
    name: "The Garden Smash",
    price: 10.5,
    category: "Burgers",
    kcal: 480,
    description: "House veggie patty, avocado, sprouts, vine tomato, tahini sauce.",
    customization: {
      included: ["avocado", "sprouts", "vine tomato", "tahini sauce", "onion", "brioche bun"],
      holdable: ["avocado", "sprouts", "tomato", "tahini sauce", "onion"],
      extras: [
        { name: "extra avocado", price: 1.5 },
        { name: "hummus", price: 1 },
        { name: "pickled jalapeños", price: 0.75 }
      ],
      prompt: "Any changes to the toppings?"
    }
  },
  // ── More Sides ───────────────────────────────────────────────────────
  {
    id: "tots",
    name: "Loaded Tots",
    price: 6.5,
    category: "Sides",
    kcal: 510,
    description: "Tater tots, melted cheddar, bacon bits, scallions, ranch drizzle.",
    customization: {
      included: ["cheddar", "bacon bits", "scallions", "ranch"],
      holdable: ["cheddar", "bacon bits", "scallions", "ranch"],
      extras: [
        { name: "extra cheese", price: 1 },
        { name: "chili crunch", price: 0.75 }
      ],
      prompt: "Want all the toppings, or hold any?"
    }
  },
  {
    id: "slaw",
    name: "House Slaw",
    price: 4,
    category: "Sides",
    kcal: 220,
    description: "Crunchy cabbage, carrot, dill vinaigrette. Cool and crisp.",
    customization: {
      included: ["dill vinaigrette"],
      holdable: ["dill vinaigrette"],
      extras: [
        { name: "ranch", price: 0.75 },
        { name: "blue cheese crumble", price: 1 }
      ],
      prompt: "Standard dressing okay?"
    }
  },
  // ── More Drinks ──────────────────────────────────────────────────────
  {
    id: "malt",
    name: "Chocolate Malt",
    price: 6.5,
    category: "Drinks",
    kcal: 540,
    description: "Thick chocolate malt, whipped cream, cherry on top.",
    customization: {
      included: ["whipped cream", "cherry"],
      holdable: ["whipped cream", "cherry"],
      extras: [
        { name: "extra malt", price: 0.75 },
        { name: "espresso shot", price: 1.5 }
      ],
      prompt: "Whip and cherry sound good?"
    }
  },
  {
    id: "lemonade",
    name: "Lemonade",
    price: 4,
    category: "Drinks",
    kcal: 160,
    description: "Fresh-squeezed, lightly sweet, served over crushed ice.",
    customization: {
      included: ["ice"],
      holdable: ["ice"],
      extras: [
        { name: "strawberry purée", price: 1 },
        { name: "mint", price: 0.5 }
      ],
      prompt: "Standard or add fruit?"
    }
  },
  {
    id: "coffee",
    name: "Iced Coffee",
    price: 4.5,
    category: "Drinks",
    kcal: 90,
    description: "Cold brew, splash of cream, lightly sweetened.",
    customization: {
      included: ["cream", "sweetener"],
      holdable: ["cream", "sweetener"],
      extras: [
        { name: "extra shot", price: 1 },
        { name: "vanilla syrup", price: 0.5 }
      ],
      prompt: "Cream and sugar, or black?"
    }
  }
];
