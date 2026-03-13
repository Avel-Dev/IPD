// In-memory house registry.
// Shape: { [houseId]: { houseId, ownerWalletAddress, meterId, createdAt } }

const housesById = Object.create(null);

export function addHouse(house) {
  housesById[house.houseId] = house;
  return house;
}

export function getHouseById(houseId) {
  return housesById[houseId] || null;
}

export function getHousesByOwner(ownerWalletAddress) {
  return Object.values(housesById).filter(
    (h) => h.ownerWalletAddress === ownerWalletAddress
  );
}

export function houseBelongsTo(houseId, ownerWalletAddress) {
  const h = getHouseById(houseId);
  return !!(h && h.ownerWalletAddress === ownerWalletAddress);
}

