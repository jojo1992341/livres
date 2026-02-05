/*
  Logique principale du prototype:
  - gestion des blocs de contenu éditables
  - pagination simulée en direct
  - configuration couverture complète
  - export/import JSON
  - export PDF via fenêtre d'impression native
*/

const state = {
  blocks: [],
  cover: {
    frontTitle: "Le Jardin des Heures",
    frontSubtitle: "Chroniques d'une ville silencieuse",
    spineText: "Le Jardin des Heures · A. Martin",
    backText:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.",
    frontImage: "",
    backImage: "",
  },
};

const dom = {
  editorCanvas: document.getElementById("editorCanvas"),
  previewPages: document.getElementById("previewPages"),
  coverPreview: document.getElementById("coverPreview"),
  insertImageInput: document.getElementById("insertImageInput"),
  importJsonInput: document.getElementById("importJsonInput"),
  frontImageInput: document.getElementById("frontImageInput"),
  backImageInput: document.getElementById("backImageInput"),
  frontTitle: document.getElementById("frontTitle"),
  frontSubtitle: document.getElementById("frontSubtitle"),
  spineText: document.getElementById("spineText"),
  backText: document.getElementById("backText"),
};

const PX_PER_CM = 37.8;
const pageInnerHeightPx = 17.8 * PX_PER_CM - 2 * (0.9 * PX_PER_CM);

function uid() {
  return `id-${Math.random().toString(36).slice(2, 11)}`;
}

function defaultContent() {
  state.blocks = [
    {
      id: uid(),
      type: "title",
      html: "Chapitre I — L'aube du papier",
    },
    {
      id: uid(),
      type: "paragraph",
      html:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras vitae libero et mi lacinia consequat. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Integer in arcu et neque gravida aliquet.",
    },
    {
      id: uid(),
      type: "quote",
      html:
        "\"Un livre n'est jamais un objet figé ; il est une respiration typographique qui cherche son lecteur.\"",
    },
    {
      id: uid(),
      type: "paragraph",
      html:
        "Praesent dictum, nisi quis aliquet eleifend, massa nisl commodo justo, sed faucibus lorem lacus ac odio. Maecenas mattis sodales nibh, ac finibus est porta sed. Suspendisse potenti.",
    },
    {
      id: uid(),
      type: "image",
      src:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(`
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'>
            <defs>
              <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
                <stop offset='0' stop-color='#efe7dc'/>
                <stop offset='1' stop-color='#cfbea8'/>
              </linearGradient>
            </defs>
            <rect width='800' height='500' fill='url(#g)'/>
            <text x='400' y='250' font-size='42' text-anchor='middle' fill='#5f4f3f' font-family='Georgia'>Image de démonstration libre</text>
          </svg>
        `),
      alt: "Illustration de démonstration",
    },
    {
      id: uid(),
      type: "paragraph",
      html:
        "Fusce placerat tortor id velit semper, vitae semper justo iaculis. Curabitur eu magna ex. Nullam pharetra nisi sed lorem pretium, in varius metus varius.",
    },
  ];

  state.cover.frontImage = state.blocks.find((b) => b.type === "image")?.src || "";
  state.cover.backImage = state.cover.frontImage;
}

function makeBlock(type, html = "") {
  const block = { id: uid(), type };
  if (type === "image") {
    block.src = html || "";
    block.alt = "Image insérée";
  } else {
    block.html = html;
  }
  state.blocks.push(block);
  renderEditor();
  renderPreview();
}

function updateCoverForm() {
  dom.frontTitle.value = state.cover.frontTitle;
  dom.frontSubtitle.value = state.cover.frontSubtitle;
  dom.spineText.value = state.cover.spineText;
  dom.backText.value = state.cover.backText;
}

function renderEditor() {
  dom.editorCanvas.innerHTML = "";
  state.blocks.forEach((block) => {
    const holder = document.createElement("div");
    holder.dataset.id = block.id;

    if (block.type === "image") {
      const img = document.createElement("img");
      img.className = "block-image";
      img.src = block.src;
      img.alt = block.alt || "Image";
      holder.appendChild(img);
    } else {
      holder.className = `editable-block block-${block.type}`;
      holder.contentEditable = "true";
      holder.innerHTML = block.html;
      holder.addEventListener("input", () => {
        block.html = holder.innerHTML;
        renderPreview();
      });
      holder.addEventListener("blur", () => {
        block.html = holder.innerHTML;
      });
    }

    dom.editorCanvas.appendChild(holder);
  });
}

function renderPreview() {
  dom.previewPages.innerHTML = "";

  const measureBox = document.createElement("div");
  measureBox.style.position = "absolute";
  measureBox.style.left = "-9999px";
  measureBox.style.top = "0";
  measureBox.style.width = "calc(11cm - 1.8cm)";
  measureBox.style.visibility = "hidden";
  document.body.appendChild(measureBox);

  let pages = [];
  let currentPage = [];
  let currentHeight = 0;

  state.blocks.forEach((block) => {
    const probe = document.createElement("div");
    if (block.type === "image") {
      probe.innerHTML = `<img src="${block.src}" style="max-width:100%; max-height:220px; display:block; margin:0.2cm 0;" />`;
    } else {
      probe.className = `block-${block.type}`;
      probe.innerHTML = block.html;
      probe.style.margin = "0.2cm 0";
    }
    measureBox.appendChild(probe);
    const blockHeight = probe.offsetHeight + 14;
    measureBox.removeChild(probe);

    if (currentHeight + blockHeight > pageInnerHeightPx && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [block];
      currentHeight = blockHeight;
    } else {
      currentPage.push(block);
      currentHeight += blockHeight;
    }
  });

  if (currentPage.length > 0) pages.push(currentPage);
  document.body.removeChild(measureBox);

  pages.forEach((pageBlocks, index) => {
    const page = document.createElement("article");
    page.className = "book-page";

    pageBlocks.forEach((block) => {
      if (block.type === "image") {
        const img = document.createElement("img");
        img.className = "block-image";
        img.src = block.src;
        img.alt = block.alt || "Image";
        page.appendChild(img);
      } else {
        const el = document.createElement("div");
        el.className = `block-${block.type}`;
        el.innerHTML = block.html;
        page.appendChild(el);
      }
    });

    const number = document.createElement("div");
    number.className = "book-page-number";
    number.textContent = String(index + 1);
    page.appendChild(number);

    dom.previewPages.appendChild(page);
  });
}

function renderCover() {
  dom.coverPreview.innerHTML = `
    <div class="cover-sheet">
      <section class="cover-panel">
        ${
          state.cover.backImage
            ? `<img src="${state.cover.backImage}" alt="Image verso" />`
            : ""
        }
        <div class="cover-text-layer">
          <p class="back-text">${state.cover.backText.replace(/\n/g, "<br />")}</p>
        </div>
      </section>
      <section class="spine-panel">
        <p class="spine-text">${state.cover.spineText}</p>
      </section>
      <section class="cover-panel">
        ${
          state.cover.frontImage
            ? `<img src="${state.cover.frontImage}" alt="Image recto" />`
            : ""
        }
        <div class="cover-text-layer">
          <h4 class="front-title">${state.cover.frontTitle}</h4>
          <p class="front-subtitle">${state.cover.frontSubtitle}</p>
        </div>
      </section>
    </div>
  `;
}

function readImageFile(file, onReady) {
  const reader = new FileReader();
  reader.onload = () => onReady(reader.result);
  reader.readAsDataURL(file);
}

function exportJson() {
  const payload = {
    version: "1.0",
    format: "11x17.8cm",
    blocks: state.blocks,
    cover: state.cover,
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "book-project.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.blocks) || !data.cover) {
        throw new Error("Fichier invalide");
      }
      state.blocks = data.blocks;
      state.cover = {
        ...state.cover,
        ...data.cover,
      };
      updateCoverForm();
      renderEditor();
      renderPreview();
      renderCover();
    } catch (error) {
      alert("Impossible d'importer ce fichier JSON.");
    }
  };
  reader.readAsText(file);
}

function bindUI() {
  document.getElementById("addTitle").addEventListener("click", () => {
    makeBlock("title", "Nouveau titre de section");
  });

  document.getElementById("addParagraph").addEventListener("click", () => {
    makeBlock("paragraph", "Nouveau paragraphe...");
  });

  document.getElementById("addQuote").addEventListener("click", () => {
    makeBlock("quote", "Nouvelle citation...");
  });

  dom.insertImageInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    readImageFile(file, (dataUrl) => {
      makeBlock("image", dataUrl);
    });
    event.target.value = "";
  });

  document.getElementById("clearContent").addEventListener("click", () => {
    if (confirm("Effacer tout le contenu intérieur ?")) {
      state.blocks = [];
      renderEditor();
      renderPreview();
    }
  });

  document.getElementById("exportPdf").addEventListener("click", () => {
    window.print();
  });

  document.getElementById("exportJson").addEventListener("click", exportJson);

  dom.importJsonInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) importJson(file);
    event.target.value = "";
  });

  dom.frontTitle.addEventListener("input", () => {
    state.cover.frontTitle = dom.frontTitle.value;
    renderCover();
  });

  dom.frontSubtitle.addEventListener("input", () => {
    state.cover.frontSubtitle = dom.frontSubtitle.value;
    renderCover();
  });

  dom.spineText.addEventListener("input", () => {
    state.cover.spineText = dom.spineText.value;
    renderCover();
  });

  dom.backText.addEventListener("input", () => {
    state.cover.backText = dom.backText.value;
    renderCover();
  });

  dom.frontImageInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    readImageFile(file, (dataUrl) => {
      state.cover.frontImage = dataUrl;
      renderCover();
    });
    event.target.value = "";
  });

  dom.backImageInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    readImageFile(file, (dataUrl) => {
      state.cover.backImage = dataUrl;
      renderCover();
    });
    event.target.value = "";
  });
}

function init() {
  defaultContent();
  updateCoverForm();
  renderEditor();
  renderPreview();
  renderCover();
  bindUI();
}

init();
