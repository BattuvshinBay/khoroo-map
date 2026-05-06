const districtSelect = document.getElementById("district-select");
const khorooSelect = document.getElementById("khoroo-select");
const basemapSelect = document.getElementById("basemap-select");
const visibleCount = document.getElementById("visible-count");
const selectedName = document.getElementById("selected-name");
const selectionDetails = document.getElementById("selection-details");

const map = L.map("map", {
  zoomControl: true,
  preferCanvas: true,
}).setView([47.9184, 106.9177], 10);

const streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
});

const satelliteLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution:
      "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
  },
);

streetLayer.addTo(map);

let allKhoroos = [];
let currentLayer = null;
let selectedLayer = null;
let districtColorMap = new Map();
let activeBaseLayer = streetLayer;

const selectedStyle = {
  color: "#d97706",
  weight: 3,
  fillColor: "#d97706",
  fillOpacity: 0.28,
};

function khorooLabel(feature) {
  return `${feature.district} - ${feature.khoroo}`;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function colorForDistrict(district) {
  return districtColorMap.get(normalizeText(district)) ?? {
    color: "#0f766e",
    fillColor: "#14b8a6",
  };
}

function baseStyle(feature) {
  const districtColors = colorForDistrict(feature.district);

  return {
    color: districtColors.color,
    weight: 1.4,
    fillColor: districtColors.fillColor,
    fillOpacity: 0.22,
  };
}

function setDetails(feature) {
  if (!feature) {
    selectedName.textContent = "Хоосон";
    selectionDetails.innerHTML = "<p>Хороо сонгоод газрын зураг дээр тодруулна уу.</p>";
    return;
  }

  selectedName.textContent = feature.khoroo;
  selectionDetails.innerHTML = `
    <h2>${feature.khoroo}</h2>
    <p><strong>Дүүрэг:</strong> ${feature.district}</p>
    <p><strong>Хороо:</strong> ${feature.khoroo_number ?? "N/A"}</p>
  `;
}

function switchBasemap(mode) {
  const nextLayer = mode === "satellite" ? satelliteLayer : streetLayer;

  if (activeBaseLayer === nextLayer) {
    return;
  }

  map.removeLayer(activeBaseLayer);
  nextLayer.addTo(map);
  activeBaseLayer = nextLayer;
}

function populateDistricts(data) {
  const districts = [...new Set(data.map((item) => normalizeText(item.district)))].sort((a, b) =>
    a.localeCompare(b),
  );

  districtColorMap = new Map(
    districts.map((district, index) => {
      const hue = Math.round((index * 360) / districts.length);
      return [
        district,
        {
          color: `hsl(${hue} 65% 35%)`,
          fillColor: `hsl(${hue} 70% 55%)`,
        },
      ];
    }),
  );

  for (const district of districts) {
    const option = document.createElement("option");
    option.value = district;
    option.textContent = district;
    districtSelect.appendChild(option);
  }
}

function populateKhoroos(features) {
  khorooSelect.innerHTML = '<option value="">Хороо сонгоно уу</option>';

  for (const [index, feature] of features.entries()) {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = khorooLabel(feature);
    khorooSelect.appendChild(option);
  }

  khorooSelect.disabled = features.length === 0;
  visibleCount.textContent = String(features.length);
}

function clearSelection() {
  if (selectedLayer) {
    selectedLayer.setStyle(baseStyle(selectedLayer.feature.properties));
  }
  selectedLayer = null;
  khorooSelect.value = "";
  setDetails(null);
}

function selectFeature(feature, layer) {
  if (selectedLayer && selectedLayer !== layer) {
    selectedLayer.setStyle(baseStyle(selectedLayer.feature.properties));
  }

  selectedLayer = layer;
  selectedLayer.setStyle(selectedStyle);
  selectedLayer.bringToFront();
  khorooSelect.value = String(feature.filteredIndex);
  setDetails(feature);
  map.fitBounds(layer.getBounds(), { padding: [28, 28] });
}

function renderMap(features) {
  if (currentLayer) {
    map.removeLayer(currentLayer);
  }

  clearSelection();

  const geoJson = features.map((feature, filteredIndex) => ({
    type: "Feature",
    properties: {
      ...feature,
      filteredIndex,
    },
    geometry: feature.geometry,
  }));

  currentLayer = L.geoJSON(geoJson, {
    style: (feature) => baseStyle(feature.properties),
    onEachFeature: (feature, layer) => {
      const props = feature.properties;
      layer.bindPopup(
        `<strong>${props.khoroo}</strong><br>${props.district}`,
      );

      layer.on("click", () => {
        selectFeature(props, layer);
      });
    },
  }).addTo(map);

  if (geoJson.length > 0) {
    map.fitBounds(currentLayer.getBounds(), { padding: [24, 24] });
  }
}

function filteredKhoroos() {
  const district = districtSelect.value;

  if (district === "all") {
    return allKhoroos.slice().sort((a, b) =>
      khorooLabel(a).localeCompare(khorooLabel(b)),
    );
  }

  return allKhoroos
    .filter((item) => normalizeText(item.district) === district)
    .sort((a, b) => {
      if (a.khoroo_number != null && b.khoroo_number != null) {
        return a.khoroo_number - b.khoroo_number;
      }
      return normalizeText(a.khoroo).localeCompare(normalizeText(b.khoroo));
    });
}

function refreshView() {
  const features = filteredKhoroos();
  populateKhoroos(features);
  renderMap(features);
}

districtSelect.addEventListener("change", () => {
  refreshView();
});

basemapSelect.addEventListener("change", () => {
  switchBasemap(basemapSelect.value);
});

khorooSelect.addEventListener("change", () => {
  const selectedIndex = Number(khorooSelect.value);
  if (Number.isNaN(selectedIndex)) {
    clearSelection();
    return;
  }

  currentLayer.eachLayer((layer) => {
    const props = layer.feature.properties;
    if (props.filteredIndex === selectedIndex) {
      selectFeature(props, layer);
    }
  });
});

fetch("./khoroos.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`khoroos.json (${response.status}) файл уншиж чадсангүй.`);
    }
    return response.json();
  })
  .then((data) => {
    allKhoroos = data;
    populateDistricts(allKhoroos);
    refreshView();
  })
  .catch((error) => {
    selectionDetails.innerHTML = `<p>${error.message}</p>`;
  });
