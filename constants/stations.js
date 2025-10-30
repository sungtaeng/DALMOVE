// /constants/stations.js
export const STATIONS = [
  { id: 'station2', title: '강남대역 앞', lat: 37.27078, lng: 127.125569, visible: true },
  { id: 'station3', title: '샬롬관 앞', lat: 37.274566, lng: 127.130307, visible: true },
  { id: 'station4', title: '교육관 앞', lat: 37.27569, lng: 127.13347, visible: true },
  { id: 'station5', title: '이공관 앞', lat: 37.276645, lng: 127.134479, visible: true },
  { id: 'station6', title: '스타벅스 앞', lat: 37.270928, lng: 127.125917, visible: true },
  { id: 'station7', title: '기흥역', lat: 37.274618, lng: 127.116129, visible: true },
];

export const getGiheungGroupCoord = () => {
  const arrival = STATIONS.find((s) => s.id === 'station7');
  if (arrival) {
    return { latitude: arrival.lat, longitude: arrival.lng };
  }
  return { latitude: 37.274618, longitude: 127.116129 };
};

export const indexOfStation = (id) => STATIONS.findIndex((s) => s.id === id);

export const MUST_PASS_BY = {
  station6: ['station5'],
  station7: ['station5'],
};
