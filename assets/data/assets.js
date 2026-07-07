/* =============================================================================
   GRENCO MEDICAL — ASSET PORTAL DATA FILE
   -----------------------------------------------------------------------------
   This is the ONE file most people need to edit. No coding experience required.

   HOW IT WORKS
   - The portal is organized as:  BRAND  ->  PRODUCT  ->  ASSET FOLDERS
   - Each product mirrors the Dropbox structure (Product Photos, Lifestyle,
     Packaging, Logos, Videos, Documents).
   - A file is { name, type, url, format, thumb, file }
       type   : "image" | "video" | "vector" | "pdf"
       format : "JPG" | "PNG" | "WEBP" | "SVG" | "MP4" | "PDF" ...
       url    : where the file lives (relative to this portal, or an https URL)
       thumb  : preview image (usually same as url for in-repo images)
       file   : downloadable original (same-origin path → direct download)

   Image paths are relative to the portal root (brand-portal/). The main
   Grenco Medical site assets live one level up, at assets/.
   ========================================================================== */

window.PORTAL_CONFIG = {
  title: "Grenco Medical Brand & Product Assets",
  tagline: "Official Elite II product and brand assets for pharmacies, partners, and press.",
  intro:
    "A self-serve hub for pharmacies, partners, and press to browse and download official Grenco Medical Elite II product photography, brand logos, videos, documents, and pharmacy marketing materials.",
  requestEmail: "support@grencomedical.com", // "Request an asset" mailto target
  orderEmail: "support@grencomedical.com",   // marketing-material order requests
  locatorEmail: "support@grencomedical.com", // pharmacy/partner listing requests
  newWindowDays: 60,                          // how many days counts as "New"
  // Usage/compliance note shown on the product page. Empty = hidden.
  usageNote: "",
};

/* Brand essentials (colors + fonts) power the "Brand essentials" panel.
   A single brand — Grenco Medical. */
window.PORTAL_BRANDS = {
  grencomedical: {
    key: "grencomedical", name: "Grenco Medical", wordmark: "GRENCO MEDICAL",
    logoProduct: "Grenco Medical Logos",
    colors: [
      { name: "Deep Teal", hex: "#134746" },
      { name: "Teal", hex: "#1C6160" },
      { name: "Accent Peach", hex: "#F0A17A" },
      { name: "Paper", hex: "#FFFFFF" },
      { name: "Ink", hex: "#14201F" },
    ],
    fonts: [
      { name: "Marcellus", role: "Display / Headlines", stack: "'Marcellus', serif" },
      { name: "DM Sans", role: "Body", stack: "'DM Sans', sans-serif" },
    ],
    // Grenco Medical has no consumer social accounts — the official website only.
    social: [
      { network: "Website", handle: "grencomedical.com", url: "https://grencomedical.com" },
    ],
    faqUrl: "https://grencomedical.com/knowledge-base.html",
    warrantyUrl: "https://grencomedical.com/support.html",
  },
};

/* CURRENT PRODUCT LINEUP (per brand, in display order). */
window.PORTAL_CURRENT = {
  grencomedical: ["Grenco Medical Elite II"],
};

// Build a file record for an in-repo image (previewable + directly downloadable).
function mkImg(file) {
  var url = "assets/" + file;
  var fmt = (file.split(".").pop() || "").toUpperCase();
  return { name: file.replace(/\.[^.]+$/, ""), type: "image", format: fmt, url: url, thumb: url, file: url };
}
function mkVec(url, name) {
  return { name: name, type: "vector", format: "SVG", url: url, thumb: url, file: url };
}

window.PORTAL_PRODUCTS = [
  {
    name: "Grenco Medical Elite II",
    brand: "grencomedical",
    category: "Therapeutic vaporiser",
    type: "Therapeutic vaporiser",
    cover: "assets/elite-ii-hero-screen.webp",
    added: "2026-06-09",
    oneSheet: "", // documents coming soon
    // Seed folders — the seven canonical categories. The Dropbox sync overlays
    // real files onto these (see synced.js); seeds show until the first sync.
    folders: {
      "Product Photos": [
        mkImg("device-marble.jpg"),
        mkImg("elite-upright.jpg"),
        mkImg("device-inhand.webp"),
        mkImg("device-examine.webp"),
        mkImg("controls-detail.webp"),
        mkImg("glance-palm.webp"),
        mkImg("elite-ii-device-spec.webp"),
      ],
      "Marketing Photos": [
        mkImg("everyday-living.webp"),
        mkImg("owner-desk.webp"),
        mkImg("travel-ready-pocket.webp"),
        mkImg("home-hero.webp"),
      ],
      "Packaging": [
        mkImg("elite-ii-box-contents.webp"),
      ],
      "Logos": [
        mkVec("assets/logos/grenco-medical-logo.svg", "grenco-medical-logo"),
        mkVec("assets/logos/grenco-medical-logo-white.svg", "grenco-medical-logo-white"),
      ],
      // Populated from Dropbox on sync.
      "Marketing": [],
      "Videos": [],
      "Documents": [],
    },
  },
  {
    // Brand-asset folder (no product device). Powers the homepage "Logos and
    // Brand Assets" section and the "Download logos" buttons.
    name: "Grenco Medical Logos",
    brand: "grencomedical",
    category: "Brand",
    isLogo: true,
    cover: "assets/logos/grenco-medical-logo.svg",
    added: "2026-06-09",
    oneSheet: "",
    folders: {
      "Logos": [
        mkVec("assets/logos/grenco-medical-logo.svg", "grenco-medical-logo"),
        mkVec("assets/logos/grenco-medical-logo-white.svg", "grenco-medical-logo-white"),
      ],
    },
  },
];

/* =============================================================================
   HOW-TO VIDEO HUB — the educational videos shown on the product page and in the
   training course. Downloadable MP4s arrive via the Dropbox sync; until then the
   videos stream from the official grencomedical.com Vimeo IDs.
   how-to-use: 1105899275 · how-to-clean: 1105929806
   ========================================================================== */
var PRODUCT_VIDEOS = {
  // The three how-to videos from the Dropbox "Videos" folder — playable inline
  // (streamed from Dropbox) and downloadable. Thumbnails are the synced frames.
  "Grenco Medical Elite II": [
    { title: "Tutorial + Cleaning", mp4: "https://www.dropbox.com/scl/fi/h55guyyrg5l4o0gx0swot/Tutorial-Cleaning.mp4?rlkey=9u4v8yi1is696q7dr3xb0qu8z", thumb: "assets/synced/elite-ii/cdc04971b473fa5eaa2cec0c2be4b27ccb0ea8afae09986fb21892abdae25e47-v2.jpg" },
    { title: "Tutorial", mp4: "https://www.dropbox.com/scl/fi/jtibibmvurgjnfz1a9u7q/Tutorial.mp4?rlkey=11i82maupvjr3afp488yjfqc3", thumb: "assets/synced/elite-ii/130d7e9f5cef72d374e879f90976a46a51530cf658098a17a6d9fd2d79f301c2-v2.jpg" },
    { title: "How to Clean", mp4: "https://www.dropbox.com/scl/fi/7sa268xzov7t4yxe9cbyg/How-to-Clean.mp4?rlkey=mndhugvmkrj03yrbzds6ugdkj", thumb: "assets/synced/elite-ii/0ce57eca4c4a703d3d607276872be08b907111b46d41eb164112f4d785501be1-v2.jpg" },
  ],
};

// Inject videos into a product-level `videos` array (the educational video hub,
// SEPARATE from the downloadable file folders).
window.PORTAL_PRODUCTS.forEach(function (p) {
  var vids = PRODUCT_VIDEOS[p.name];
  if (!vids || !vids.length) return;
  p.videos = vids.map(function (v) {
    if (v.vimeo) {
      return {
        title: v.title, thumb: v.thumb || null,
        embed: "https://player.vimeo.com/video/" + v.vimeo + "?" + (v.hash ? "h=" + v.hash + "&" : "") + "title=0&byline=0&portrait=0&dnt=1",
        url: "https://vimeo.com/" + v.vimeo + (v.hash ? "/" + v.hash : ""),
      };
    }
    return { title: v.title, mp4: v.mp4, thumb: v.thumb || null };
  });
});

/* =============================================================================
   PRODUCT INFO — official copy for the Elite II hub. Facts only; unknowns are
   marked "To be confirmed". Do not add pricing, unverified specs, or claims.
   ========================================================================== */
var PRODUCT_INFO = {
  "Grenco Medical Elite II": {
    description:
      "An internationally certified therapeutic vaporiser for dried medicinal cannabis flower, built in ISO 13485 · MDSAP-certified medical device facilities.",
    highlights: [
      "Even, repeatable heat — convection and conduction around a full ceramic chamber, held to within ±1°C",
      "Adjustable temperature 93°C–221°C on a full-colour screen with customisable haptic feedback",
      "Magnetic zirconia ceramic mouthpiece — cool-to-touch and easy to handle, including for reduced dexterity",
      "Spiral air path cools the vapour on its way through",
      "USB-C charging; included pick tool",
      "Built in ISO 13485 + MDSAP facilities; assessed against recognised safety and biocompatibility standards",
    ],
    fullDescription: [
      "The Grenco Medical Elite II is an internationally certified therapeutic vaporiser for dried medicinal cannabis flower. Medically certified in multiple countries and backed by certified medical device manufacturing, it holds a set temperature from 93°C to 221°C to within ±1°C using combined convection and conduction around a full ceramic chamber with a patented clean-air intake. A magnetic zirconia ceramic mouthpiece stays cool to the touch and is designed for easy handling.",
      "Regulatory: Australia ARTG Entry 526764 (Class IIb medical device), Health Canada HC MDL 113029, Medsafe NZ WAND registered, and MDSAP · ISO 13485 manufacturing certification.",
    ],
    warranty: "2-year manufacturer's warranty",
    // Packaging section: which "Packaging" folder images to show as the retail
    // box front/back (matched by Dropbox file name, so re-syncs stay linked).
    packaging: { front: "Elite2 Box Right", side: "Elite2 Box and Sleeve Side", back: "Elite2 Box and Sleeve Rear Left MedLeaf" },
    manual: "https://grencomedical.com/documents/public/elite-ii-instructions-for-use-v2-3.pdf",
    faqUrl: "https://grencomedical.com/knowledge-base.html",
    productUrl: "https://grencomedical.com/elite-ii.html",
    box: {
      image: "assets/elite-ii-box-contents.webp",
      contents: [
        "Grenco Medical Elite II Vaporiser",
        "Hemp travel case",
        "Protective silicone sleeve",
        "USB-C charging cable",
        "Removable pick tool",
      ],
    },
    // Specifications & regulatory — rendered as an ordered spec table. Unknown
    // values are "To be confirmed" (never invented).
    specs: [
      { label: "ARTG Entry", val: "526764 · Class IIb" },
      { label: "Health Canada", val: "HC MDL 113029" },
      { label: "Medsafe NZ", val: "WAND registered" },
      { label: "Manufacturing", val: "MDSAP · ISO 13485" },
      { label: "Temperature range", val: "93°C–221°C (±1°C)" },
      { label: "Charging", val: "USB-C" },
      { label: "Warranty", val: "2 years" },
      { label: "SKU", val: "To be confirmed" },
      { label: "UPC", val: "To be confirmed" },
      { label: "Dimensions", val: "To be confirmed" },
      { label: "Weight", val: "To be confirmed" },
      { label: "Case pack", val: "To be confirmed" },
      { label: "HTS code", val: "To be confirmed" },
    ],
  },
};

// Attach info to each product; empty object if none.
window.PORTAL_PRODUCTS.forEach(function (p) {
  p.info = PRODUCT_INFO[p.name] || {};
});

// Short type tag shown on the current-product card.
(function () {
  var LABELS = { "Grenco Medical Elite II": "Therapeutic vaporiser" };
  window.PORTAL_PRODUCTS.forEach(function (p) { if (LABELS[p.name]) p.label = LABELS[p.name]; });
})();

/* Live Dropbox sync overlay: assets/data/synced.js (regenerated by the GitHub
   Action) defines window.PORTAL_SYNCED = { "<Product>": { folders, dropbox } }.
   When present, the real Dropbox folders/files replace the placeholder ones. */
(function () {
  var SYNCED = (typeof window !== "undefined" && window.PORTAL_SYNCED) || {};
  window.PORTAL_PRODUCTS.forEach(function (p) {
    var s = SYNCED[p.name];
    if (s && s.folders && Object.keys(s.folders).length) {
      // Merge synced folders over the seeded ones so in-repo images stay if a
      // Dropbox folder is empty, but real synced files win when present.
      Object.keys(s.folders).forEach(function (f) {
        if (s.folders[f] && s.folders[f].length) p.folders[f] = s.folders[f];
      });
      if (s.dropbox) p.dropbox = s.dropbox;
      if (s.folderLinks) p.folderLinks = s.folderLinks;   // per-category Dropbox download links
      p.synced = true;
    }
  });
  // Build the "How to use videos" hub from the synced "Videos" folder when its
  // files have playable per-file share links; otherwise keep the Vimeo fallback.
  window.PORTAL_PRODUCTS.forEach(function (p) {
    var vids = (p.folders && p.folders["Videos"]) || [];
    if (vids.some(function (v) { return v.link; })) {
      p.videos = vids.map(function (v) {
        return { title: v.name, thumb: v.thumb || null, mp4: v.link || null };
      });
    }
  });
})();

/* =============================================================================
   PRODUCT TRAINING — self-serve "Product Specialist" certification course.
   Grounded ONLY in the official Elite II facts above and grencomedical.com's
   knowledge base. No invented specs or claims.
   ========================================================================== */
window.PORTAL_TRAINING = {
  "Grenco Medical Elite II": {
    tagline: "Learn the Grenco Medical Elite II inside-out, then pass the quiz to become a Certified Grenco Medical Elite II Specialist.",
    minutes: 8,
    passPct: 80,
    certTitle: "Certified Grenco Medical Elite II Specialist",
    modules: [
      {
        title: "Product & Regulatory Overview",
        points: [
          "The Elite II is an <strong>internationally certified therapeutic vaporiser</strong> for <strong>dried medicinal cannabis flower</strong>.",
          "It is a <strong>prescription medical device</strong> — materials must not be used to advertise or promote its supply to the public.",
          "Regulatory registrations: <strong>Australia ARTG Entry 526764 (Class IIb)</strong>, <strong>Health Canada HC MDL 113029</strong>, and <strong>Medsafe NZ WAND registered</strong>.",
          "Manufactured under <strong>MDSAP · ISO 13485</strong> certification and assessed against recognised safety and biocompatibility standards.",
        ],
      },
      {
        title: "How It Heats",
        points: [
          "Combined <strong>convection and conduction</strong> around a <strong>full ceramic chamber</strong> with a <strong>patented clean-air intake</strong>.",
          "Holds a set temperature from <strong>93°C to 221°C</strong> to within <strong>±1°C</strong>.",
          "Temperature is adjustable on a <strong>full-colour screen</strong> with <strong>customisable haptic feedback</strong>.",
          "A <strong>spiral air path</strong> cools the vapour on its way through.",
        ],
      },
      {
        title: "Handling & Accessibility",
        points: [
          "The <strong>magnetic zirconia ceramic mouthpiece</strong> stays <strong>cool to the touch</strong>.",
          "Designed for <strong>easy handling, including for reduced dexterity</strong>.",
          "Charges via <strong>USB-C</strong>; an <strong>included pick tool</strong> assists with loading and cleaning.",
        ],
      },
      {
        title: "In the Box & Warranty",
        points: [
          "In the box: <strong>Elite II Vaporiser</strong>, <strong>hemp travel case</strong>, <strong>protective silicone sleeve</strong>, <strong>USB-C charging cable</strong>, and a <strong>removable pick tool</strong>.",
          "Backed by a <strong>2-year manufacturer's warranty</strong>.",
          "Direct patients to <strong>speak with their prescriber</strong>; the knowledge base at grencomedical.com/knowledge-base.html has more detail.",
        ],
      },
    ],
    quiz: [
      { q: "What is the Grenco Medical Elite II designed to vaporise?",
        choices: ["Dried medicinal cannabis flower", "Concentrates and oils", "Nicotine e-liquid", "Any of the above"],
        answer: 0, why: "The Elite II is a therapeutic vaporiser for dried medicinal cannabis flower." },
      { q: "What is the adjustable temperature range, and how tightly is it held?",
        choices: ["40°C–100°C, ±5°C", "93°C–221°C, ±1°C", "150°C–300°C, ±10°C", "Fixed single temperature"],
        answer: 1, why: "It holds a set temperature from 93°C to 221°C to within ±1°C." },
      { q: "How does the Elite II generate heat?",
        choices: ["Open flame", "Combined convection and conduction around a full ceramic chamber", "Induction coil only", "Ultrasonic"],
        answer: 1, why: "It uses combined convection and conduction around a full ceramic chamber with a patented clean-air intake." },
      { q: "What material is the magnetic mouthpiece made from, and how does it feel in use?",
        choices: ["Aluminium — warms up in use", "Zirconia ceramic — stays cool to the touch", "Glass — fragile", "Silicone — flexible"],
        answer: 1, why: "The magnetic zirconia ceramic mouthpiece stays cool to the touch and is designed for easy handling." },
      { q: "How is the Elite II charged?",
        choices: ["Micro-USB", "USB-C", "Wireless only", "Replaceable AA batteries"],
        answer: 1, why: "The Elite II charges via USB-C, and a pick tool is included." },
      { q: "Under which certifications is the Elite II manufactured?",
        choices: ["CE toy safety", "MDSAP · ISO 13485", "FCC only", "None"],
        answer: 1, why: "It is built in MDSAP · ISO 13485-certified facilities and assessed against recognised safety and biocompatibility standards." },
      { q: "Which regulatory registration is correct for Australia?",
        choices: ["ARTG Entry 526764, Class IIb medical device", "TGA exempt consumer good", "ARTG Entry 000000, Class I", "Not registered in Australia"],
        answer: 0, why: "Australia: ARTG Entry 526764, a Class IIb medical device." },
      { q: "What is the manufacturer's warranty period?",
        choices: ["30 days", "1 year", "2 years", "Lifetime"],
        answer: 2, why: "The Elite II is backed by a 2-year manufacturer's warranty." },
      { q: "Which item is included in the box?",
        choices: ["A 510 cartridge", "A removable pick tool", "Cannabis flower", "A wall adaptor plug"],
        answer: 1, why: "The box includes the Elite II, a hemp travel case, a protective silicone sleeve, a USB-C charging cable, and a removable pick tool." },
      { q: "How should these assets and the device be positioned to the public?",
        choices: ["As a consumer lifestyle product to advertise widely", "As a prescription medical device — not for advertising or promoting supply to the public; direct patients to their prescriber", "With a retail price and buy-now links", "However the partner prefers"],
        answer: 1, why: "It is a prescription medical device; materials must not be used to advertise or promote supply to the public, and patients should speak with their prescriber." },
    ],
  },
};
