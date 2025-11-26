const fs = require("fs");
const path = require("path");

// Directorio de productos individuales
const productsDir = path.join(__dirname, "data", "products");
// Archivo final que tu web usa
const outputFile = path.join(__dirname, "products.json");

// Asegurarnos de que la carpeta exista
if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true });
}

function buildProductsJson() {
  const items = [];

  // Si la carpeta existe pero está vacía, esto devolverá []
  const files = fs.readdirSync(productsDir).filter(f => f.endsWith(".json"));

  files.forEach(file => {
    const filePath = path.join(productsDir, file);
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      items.push(data);
    } catch (err) {
      console.warn(`Archivo JSON inválido: ${file}`, err.message);
    }
  });

  const jsonFinal = JSON.stringify({ items }, null, 2);
  fs.writeFileSync(outputFile, jsonFinal);

  console.log(`✓ products.json generado correctamente con ${items.length} productos.`);
}

buildProductsJson();
