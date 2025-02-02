import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Button,
} from "react-native"; 
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  query,
  getDocs
} from 'firebase/firestore'; 
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebaseConfig';
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as Animatable from "react-native-animatable";
import { MaterialIcons } from '@expo/vector-icons';
import { fetchNewestPolicies } from "../api/PolicyApi";
import { summarizeAbstract } from "../api/GeminiAPi";

export default function HomeScreen() {
  const [policies, setPolicies] = useState([]);
  const [filteredPolicies, setFilteredPolicies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState(null);
  const [sortOrder, setSortOrder] = useState("newest");
  const [modalVisible, setModalVisible] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState(null);
  const [webViewRef, setWebViewRef] = useState(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [flippedCardIndex, setFlippedCardIndex] = useState(null);
  const [votingEnabled, setVotingEnabled] = useState({});
  const [userVotes, setUserVotes] = useState({});
  
  const auth = getAuth();

  useEffect(() => {
    const getPolicies = async () => {
      try {
        const data = await fetchNewestPolicies();
        if (data && data.results) {
          const publishedPolicies = data.results.filter((policy) => policy.publication_date);
  
          const policiesWithSummaries = await Promise.all(
            publishedPolicies.map(async (policy) => {
              const { summary, pros, cons } = await summarizeAbstract(policy.abstract);
              return { ...policy, summary, pros, cons };
            })
          );
  
          await syncPoliciesWithFirebase(policiesWithSummaries);
          await loadUserVotes();
          const firebasePolicies = await getFirebasePolicies();
          setPolicies(firebasePolicies);
          setFilteredPolicies(firebasePolicies);
        }
      } catch (error) {
        console.error("Error fetching policies:", error);
      }
    };
  
    getPolicies();
  }, [auth.currentUser]);

  const loadUserVotes = async () => {
    if (!auth.currentUser) {
      setUserVotes({});
      return;
    }

    try {
      const userVotesRef = doc(db, 'userVotes', auth.currentUser.uid);
      const userVotesDoc = await getDoc(userVotesRef);
      
      if (userVotesDoc.exists()) {
        setUserVotes(userVotesDoc.data());
      }
    } catch (error) {
      console.error("Error loading user votes:", error);
    }
  };

  const syncPoliciesWithFirebase = async (policies) => {
    const policiesRef = collection(db, 'policies');
  
    for (const policy of policies) {
      const docRef = doc(policiesRef, policy.document_number);
      const docSnap = await getDoc(docRef);
  
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          ...policy,
          upvotes: 0,
          downvotes: 0,
          createdAt: new Date().toISOString()
        });
      }
    }
  };

  const getFirebasePolicies = async () => {
    const policiesRef = collection(db, 'policies');
    const q = query(policiesRef);
    const querySnapshot = await getDocs(q);
    
    const policies = [];
    querySnapshot.forEach((doc) => {
      policies.push({ id: doc.id, ...doc.data() });
    });
    
    return policies;
  };

  const updateUserVote = async (policyId, voteType, previousVote) => {
    if (!auth.currentUser) return null;
  
    const userVotesRef = doc(db, 'userVotes', auth.currentUser.uid);
    const policyRef = doc(db, 'policies', policyId);
    
    try {
      const docSnap = await getDoc(policyRef);
      if (docSnap.exists()) {
        const policy = docSnap.data();
        const updates = {};
  
        // If clicking the same vote type again, remove the vote
        if (previousVote === voteType) {
          updates[`${voteType}s`] = Math.max((policy[`${voteType}s`] || 1) - 1, 0);
          voteType = null; // Clear the vote
        } else {
          // Remove previous vote if exists
          if (previousVote) {
            updates[`${previousVote}s`] = Math.max((policy[`${previousVote}s`] || 1) - 1, 0);
          }
          // Add new vote
          if (voteType) {
            updates[`${voteType}s`] = (policy[`${voteType}s`] || 0) + 1;
          }
        }
  
        await updateDoc(policyRef, updates);
  
        // Update user's vote record
        if (voteType === null) {
          // Remove the vote from user's records
          const updatedVotes = { ...userVotes };
          delete updatedVotes[policyId];
          await setDoc(userVotesRef, updatedVotes);
        } else {
          // Set the new vote
          await setDoc(userVotesRef, {
            ...userVotes,
            [policyId]: voteType
          }, { merge: true });
        }
  
        return { updates, voteType };
      }
    } catch (error) {
      console.error("Error updating vote:", error);
    }
    return null;
  };

  const handleVote = async (policyId, voteType) => {
    if (!auth.currentUser) {
      alert("Please sign in to vote");
      return;
    }
  
    const previousVote = userVotes[policyId];
  
    try {
      setVotingEnabled(prev => ({ ...prev, [policyId]: true }));
      
      const result = await updateUserVote(policyId, voteType, previousVote);
      if (result) {
        const { updates, voteType: newVoteType } = result;
        
        // Update user votes state
        if (newVoteType === null) {
          setUserVotes(prev => {
            const newVotes = { ...prev };
            delete newVotes[policyId];
            return newVotes;
          });
        } else {
          setUserVotes(prev => ({
            ...prev,
            [policyId]: newVoteType
          }));
        }
  
        // Update policies state
        const updatedPolicies = policies.map(policy => {
          if (policy.document_number === policyId) {
            return {
              ...policy,
              upvotes: updates.upvotes !== undefined ? updates.upvotes : policy.upvotes || 0,
              downvotes: updates.downvotes !== undefined ? updates.downvotes : policy.downvotes || 0
            };
          }
          return policy;
        });
        
        setPolicies(updatedPolicies);
        setFilteredPolicies(updatedPolicies);
      }
    } catch (error) {
      console.error("Error updating vote:", error);
    } finally {
      setVotingEnabled(prev => ({ ...prev, [policyId]: false }));
    }
  };

  const sortPolicies = (order) => {
    if (sortOrder === order) return;

    const sorted = [...filteredPolicies].sort((a, b) =>
      order === "newest"
        ? new Date(b.publication_date) - new Date(a.publication_date)
        : new Date(a.publication_date) - new Date(b.publication_date)
    );

    setFilteredPolicies(sorted);
    setSortOrder(order);
  };

  const filterByType = (type) => {
    if (filterType === type) return;

    const filtered = type ? policies.filter((policy) => policy.type === type) : policies;
    setFilteredPolicies(filtered);
    setFilterType(type);
    setModalVisible(false);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query) {
      setFilteredPolicies(policies);
    } else {
      const lowerQuery = query.toLowerCase();
      const results = policies.filter(
        (policy) =>
          policy.title?.toLowerCase().includes(lowerQuery) ||
          policy.abstract?.toLowerCase().includes(lowerQuery) ||
          policy.summary?.toLowerCase().includes(lowerQuery)
      );
      setFilteredPolicies(results);
    }
  };

  const handleBackPress = () => {
    if (canGoBack && webViewRef) {
      webViewRef.goBack();
    } else {
      setWebViewUrl(null);
    }
  };

  const webViewRefCallback = useCallback((ref) => {
    if (ref) {
      setWebViewRef(ref);
    }
  }, []);

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setFlippedCardIndex(index === flippedCardIndex ? null : index)}
    >
      <Animatable.View
        style={styles.cardContent}
        animation="fadeIn"
        duration={500}
        useNativeDriver
      >
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.type}>{item.type}</Text>
        <Text style={styles.abstract}>{item.summary}</Text>
        <Text style={styles.date}>Published: {item.publication_date}</Text>
  
        {flippedCardIndex === index && (
          <View style={styles.cardBack}>
            <Text style={styles.cardBackText}>Pros:</Text>
            <Text style={styles.cardBackText}>{item.pros}</Text>
            <Text style={styles.cardBackText}>Cons:</Text>
            <Text style={styles.cardBackText}>{item.cons}</Text>
            
            <View style={styles.votingContainer}>
              <TouchableOpacity 
                style={[
                  styles.voteButton,
                  userVotes[item.document_number] === 'upvote' && styles.votedButton
                ]}
                onPress={() => handleVote(item.document_number, 'upvote')}
                disabled={votingEnabled[item.document_number]}
              >
                <MaterialIcons 
                  name="thumb-up" 
                  size={24} 
                  color={userVotes[item.document_number] === 'upvote' ? "#007bff" : "#ccc"} 
                />
                <Text style={styles.voteCount}>{item.upvotes || 0}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.voteButton,
                  userVotes[item.document_number] === 'downvote' && styles.votedButton
                ]}
                onPress={() => handleVote(item.document_number, 'downvote')}
                disabled={votingEnabled[item.document_number]}
              >
                <MaterialIcons 
                  name="thumb-down" 
                  size={24} 
                  color={userVotes[item.document_number] === 'downvote' ? "#dc3545" : "#ccc"} 
                />
                <Text style={styles.voteCount}>{item.downvotes || 0}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
  
        <TouchableOpacity
          style={styles.learnMoreButton}
          onPress={() => {
            setWebViewUrl(item.html_url);
          }}
        >
          <Text style={styles.learnMoreText}>Learn More!</Text>
        </TouchableOpacity>
      </Animatable.View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        <View style={styles.navbar}>
          <Text style={styles.navTitle}>GovDigest</Text>
          <TextInput
            style={styles.searchBar}
            placeholder="Search policies..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.filterText}>Filter</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Filter & Sort</Text>
            <Button title="All Types" onPress={() => filterByType(null)} />
            <Button title="Rules" onPress={() => filterByType("Rule")} />
            <Button title="Notices" onPress={() => filterByType("Notice")} />
            <Button title="Proposed Rules" onPress={() => filterByType("Proposed Rule")} />
            <Button title="Close" onPress={() => setModalVisible(false)} />
          </View>
        </Modal>

        <FlatList
          data={filteredPolicies}
          keyExtractor={(item) => item.document_number}
          renderItem={renderItem}
        />

        {webViewUrl && (
          <Modal visible={true} animationType="slide">
            <SafeAreaView style={styles.webViewContainer}>
              <View style={styles.webViewHeader}>   
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => setWebViewUrl(null)}
                >
                  <Text style={styles.headerButtonText}>Close</Text>
                </TouchableOpacity>
              </View>

              <WebView
                ref={webViewRefCallback}
                onNavigationStateChange={(navState) => {
                  setCanGoBack(navState.canGoBack);
                  console.log('Navigating to:', navState.url);
                }}
                source={{ uri: webViewUrl }}
              />
            </SafeAreaView>
          </Modal>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  container: {
    flex: 1,
    padding: 10,
  },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 5,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  searchBar: {
    flex: 1,
    marginHorizontal: 10,
    backgroundColor: "#fff",
    padding: 5,
    borderRadius: 5,
  },
  filterButton: {
    backgroundColor: "#0056b3",
    padding: 8,
    borderRadius: 5,
  },
  filterText: {
    color: "#fff",
    fontSize: 16,
  },
  card: {
    marginVertical: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    flexDirection: "column",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  type: {
    fontSize: 16,
    color: "#555",
    marginVertical: 5,
  },
  abstract: {
    fontSize: 14,
    color: "#777",
  },
  date: {
    fontSize: 12,
    color: "#888",
    marginVertical: 5,
  },
  learnMoreButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#007bff",
    borderRadius: 5,
  },
  learnMoreText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cardBack: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f1f1f1",
    borderRadius: 10,
  },
  cardBackText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  modalView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
  },
  webViewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  headerButton: {
    backgroundColor: "#0056b3",
    padding: 10,
    borderRadius: 5,
  },
  headerButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  headerButtonDisabled: {
    backgroundColor: "#ccc",
  },
  votingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#f8f9fa',
  },
  votedButton: {
    backgroundColor: '#e9ecef',
  },
  voteCount: {
    marginLeft: 5,
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  }
});