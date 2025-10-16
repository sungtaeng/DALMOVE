// /constants/stations.js
export const STATIONS = [
  { id: 'station1', title: '기흥역 출발', lat: 37.274514, lng: 127.116160 },
  { id: 'station2', title: '강남대역',     lat: 37.270780, lng: 127.125569 },
  { id: 'station3', title: '샬롬관 앞',    lat: 37.274566, lng: 127.130307 },
  { id: 'station4', title: '교육관 앞',    lat: 37.275690, lng: 127.133470 },
  { id: 'station5', title: '이공관 앞',    lat: 37.276645, lng: 127.134479 },
  { id: 'station6', title: '스타벅스 앞',  lat: 37.270928, lng: 127.125917 },
  { id: 'station7', title: '기흥역 도착',  lat: 37.274618, lng: 127.116129 },
];

export const GIHEUNG_IDS = ['station1', 'station7'];

export const getGiheungGroupCoord = () => {
  const a = STATIONS.find((s) => s.id === 'station1');
  const b = STATIONS.find((s) => s.id === 'station7');
  return {
    latitude: (a.lat + b.lat) / 2,
    longitude: (a.lng + b.lng) / 2,
  };
};

export const indexOfStation = (id) => STATIONS.findIndex((s) => s.id === id);
