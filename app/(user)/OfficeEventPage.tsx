import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_ENDPOINTS } from '../../env';

interface Event {
  id: string | number;
  title: string;
  description: string;
  organizer: string;
  date: string;
  location: string;
  image: string | null;
}

const OfficeEventPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const upcomingRef = useRef(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching events from:', API_ENDPOINTS.EVENTS);
        
        const response = await axios.get(API_ENDPOINTS.EVENTS, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log('Events API response:', response.data);
        
        if (!Array.isArray(response.data)) {
          console.error('Invalid data format:', response.data);
          setError('Invalid data format received from server');
          return;
        }
        
        const apiEvents = response.data.map(event => {
          const eventDate = event.date.includes('T') ? event.date : `${event.date}T00:00:00`;
          return {
            id: event.id,
            title: event.name || 'Untitled Event',
            description: event.description || 'No description',
            organizer: 'HR Team',
            date: eventDate,
            location: event.location || 'TBD',
            image: event.eventImage ? `data:image/jpeg;base64,${event.eventImage}` : null
          };
        });
        
        console.log('Processed events:', apiEvents);
        setEvents(apiEvents);
        setError(null);
      } catch (error: any) {
        console.error('Failed to fetch events:', error);
        if (error.response) {
          setError(`Failed to load events: ${error.response.status} - ${error.response.data?.message || 'Server error'}`);
        } else if (error.request) {
          setError('No response from server. Please check your connection.');
        } else {
          setError(`Failed to load events: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const filteredEvents = events
    .filter((event) => {
      // Show all events for now, remove date filtering
      return true;
    })
    .filter((event) =>
      event.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const currentEvent = filteredEvents[0];
  const nextEvents = filteredEvents.slice(1);

  const handleToggleUpcoming = () => {
    setShowUpcoming((prev) => !prev);
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.main}>
        <Text style={styles.heading}>Events</Text>
        
        <TextInput
          style={styles.searchInput}
          placeholder="Search events by name..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 20 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : selectedEvent ? (
          <Modal visible={!!selectedEvent} animationType="slide" transparent onRequestClose={() => setSelectedEvent(null)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modal}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedEvent(null)}>
                  <Text style={styles.backBtnText}>← Back to Events</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{selectedEvent.title}</Text>
                {selectedEvent.image ? (
                  <Image source={{ uri: selectedEvent.image }} style={styles.detailImage} />
                ) : (
                  <View style={styles.noImage}><Text>No image available</Text></View>
                )}
                <Text style={styles.description}>{selectedEvent.description}</Text>
                <Text style={styles.info}><Text style={styles.bold}>Organizer:</Text> {selectedEvent.organizer}</Text>
                <Text style={styles.info}><Text style={styles.bold}>Date:</Text> {new Date(selectedEvent.date).toLocaleDateString()}</Text>
                <Text style={styles.info}><Text style={styles.bold}>Location:</Text> {selectedEvent.location}</Text>
              </View>
            </View>
          </Modal>
        ) : filteredEvents.length === 0 ? (
          <View style={styles.noEventsContainer}>
            <Text style={styles.noEvents}>No upcoming events found.</Text>
            <Text style={styles.noEventsSubtext}>Check back later for new events!</Text>
          </View>
        ) : (
          <>
            {currentEvent && (
              <View style={styles.currentEvent}>
                <Text style={styles.subHeading}>Current Event</Text>
                <View style={styles.card}>
                  {currentEvent.image ? (
                    <Image source={{ uri: currentEvent.image }} style={styles.image} />
                  ) : (
                    <View style={styles.noImage}><Text>No image available</Text></View>
                  )}
                  <View style={styles.content}>
                    <Text style={styles.title}>{currentEvent.title}</Text>
                    <Text style={styles.description}>{currentEvent.description}</Text>
                    <Text style={styles.info}><Text style={styles.bold}>Organizer:</Text> {currentEvent.organizer}</Text>
                    <Text style={styles.info}><Text style={styles.bold}>Date:</Text> {new Date(currentEvent.date).toLocaleDateString()}</Text>
                    <Text style={styles.info}><Text style={styles.bold}>Location:</Text> {currentEvent.location}</Text>
                    <TouchableOpacity style={styles.detailsBtn} onPress={() => setSelectedEvent(currentEvent)}>
                      <Text style={styles.detailsBtnText}>See Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
            <TouchableOpacity style={styles.toggleBtn} onPress={handleToggleUpcoming}>
              <Text style={styles.toggleBtnText}>{showUpcoming ? 'Hide Upcoming Events' : 'Show Upcoming Events'}</Text>
            </TouchableOpacity>
            {showUpcoming && nextEvents.length > 0 && (
              <View style={styles.upcomingEvents}>
                <Text style={styles.subHeading}>Upcoming Events</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
                  <View style={styles.eventsList}>
                    {nextEvents.map((event) => (
                      <View key={event.id} style={styles.card}>
                        {event.image ? (
                          <Image source={{ uri: event.image }} style={styles.image} />
                        ) : (
                          <View style={styles.noImage}><Text>No image available</Text></View>
                        )}
                        <View style={styles.content}>
                          <Text style={styles.title}>{event.title}</Text>
                          <Text style={styles.description}>{event.description}</Text>
                          <Text style={styles.info}><Text style={styles.bold}>Organizer:</Text> {event.organizer}</Text>
                          <Text style={styles.info}><Text style={styles.bold}>Date:</Text> {new Date(event.date).toLocaleDateString()}</Text>
                          <Text style={styles.info}><Text style={styles.bold}>Location:</Text> {event.location}</Text>
                          <TouchableOpacity style={styles.detailsBtn} onPress={() => setSelectedEvent(event)}>
                            <Text style={styles.detailsBtnText}>See Details</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f2f6ff' },
  main: { padding: 16 },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' },
  searchInput: { backgroundColor: '#fff', borderRadius: 8, padding: 8, marginBottom: 16 },
  error: { color: '#c62828', marginBottom: 16, textAlign: 'center' },
  noEvents: { color: '#999', textAlign: 'center', marginVertical: 16 },
  currentEvent: { marginBottom: 24 },
  subHeading: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#1a1a1a' },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e1e1e1', flexDirection: 'row', alignItems: 'center', minWidth: 300, marginRight: 12 },
  image: { width: 80, height: 80, borderRadius: 8, marginRight: 16 },
  noImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  description: { fontSize: 14, color: '#666', marginBottom: 4 },
  info: { fontSize: 12, color: '#666', marginBottom: 2 },
  bold: { fontWeight: 'bold', color: '#333' },
  detailsBtn: { backgroundColor: '#007AFF', padding: 8, borderRadius: 4, marginTop: 8, alignSelf: 'flex-start' },
  detailsBtnText: { color: '#fff', fontWeight: 'bold' },
  toggleBtn: { backgroundColor: '#FF9800', padding: 10, borderRadius: 8, marginBottom: 16, alignItems: 'center' },
  toggleBtnText: { color: '#fff', fontWeight: 'bold' },
  upcomingEvents: { marginTop: 16 },
  scrollContainer: { paddingVertical: 8 },
  eventsList: { flexDirection: 'row' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%' },
  backBtn: { marginBottom: 12 },
  backBtnText: { color: '#007AFF', fontWeight: 'bold', fontSize: 16 },
  detailImage: { width: 200, height: 200, borderRadius: 12, alignSelf: 'center', marginBottom: 16 },
  debugInfo: { marginBottom: 16 },
  debugText: { color: '#666', marginBottom: 4 },
  testButton: { backgroundColor: '#FF9800', padding: 8, borderRadius: 6, marginTop: 8 },
  testButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  noEventsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noEventsSubtext: { color: '#999', textAlign: 'center', marginTop: 8 },
});

export default OfficeEventPage; 