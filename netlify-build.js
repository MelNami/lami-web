const fs = require("fs");
const path = require("path");

// Directorio de productos individuales
const productsDir = path.join(__dirname, "data/products");

// Archivo final que tu web usará
const outputFile = path.join(__dirname, "products.json");

function buildProductsJson() {
  const items = [];

  // Leer todos los archivos .json dentro de data/products/
  const files = fs.readdirSync(productsDir);

  files.forEach(file => {
    if (file.endsWith(".json")) {
      const filePath = path.join(productsDir, file);
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      items.push(data);
    }
  });

  // Crear products.json final
  const jsonFinal = JSON.stringify({ items }, null, 2);

  fs.writeFileSync(outputFile, jsonFinal);

  console.log("✓ products.json generado correctamente.");
}

buildProductsJson();
