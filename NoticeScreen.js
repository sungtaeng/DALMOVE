import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { firestore } from './firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const NoticeScreen = () => {
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    const q = query(collection(firestore, 'notices'), orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, snapshot => {
      const result = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('📡 실시간 공지:', result);
      setNotices(result);
    });

    return () => unsubscribe(); // 컴포넌트 언마운트 시 구독 해제
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.title}>📢 {item.title}</Text>
      <Text style={styles.date}>
        {item.date?.seconds
          ? new Date(item.date.seconds * 1000).toLocaleDateString()
          : ''}
      </Text>
      <Text style={styles.content}>{item.content}</Text>
    </View>
  );

  return (
    <FlatList
      data={notices}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={{ color: '#888' }}>공지사항이 없습니다.</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#ccc'
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16
  },
  date: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  content: {
    marginTop: 8
  },
  empty: {
    alignItems: 'center',
    marginTop: 50
  }
});

export default NoticeScreen;
