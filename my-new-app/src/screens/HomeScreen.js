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
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchNewestPolicies } from "../api/PolicyApi";
import { summarizeAbstract } from "../api/GeminiAPi";
import { WebView } from "react-native-webview";
import * as Animatable from "react-native-animatable";

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
  const [flippedCardIndex, setFlippedCardIndex] = useState(null); // Track the flipped card

  useEffect(() => {
    const getPolicies = async () => {
      try {
        const data = await fetchNewestPolicies();
        if (data && data.results) {
          const publishedPolicies = data.results.filter((policy) => policy.publication_date);
  
          // Summarize each policy's abstract and include pros and cons
          const policiesWithSummaries = await Promise.all(
            publishedPolicies.map(async (policy) => {
              const { summary, pros, cons } = await summarizeAbstract(policy.abstract);
              return { ...policy, summary, pros, cons };
            })
          );
  
          setPolicies(policiesWithSummaries);
          setFilteredPolicies(policiesWithSummaries);
        }
      } catch (error) {
        console.error("Error fetching policies:", error);
      }
    };
  
    getPolicies();
  }, []);

  const sortPolicies = (order) => {
    if (sortOrder === order) return; // Avoid re-sorting if order is unchanged

    const sorted = [...filteredPolicies].sort((a, b) =>
      order === "newest"
        ? new Date(b.publication_date) - new Date(a.publication_date)
        : new Date(a.publication_date) - new Date(b.publication_date)
    );

    setFilteredPolicies(sorted);
    setSortOrder(order);
  };

  const filterByType = (type) => {
    if (filterType === type) return; // Avoid re-filtering if type is unchanged

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
          policy.summary?.toLowerCase().includes(lowerQuery) // Allow search in summaries
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
      onPress={() => setFlippedCardIndex(index === flippedCardIndex ? null : index)} // Flip card on card click
    >
      <Animatable.View
        style={styles.cardContent}
        animation="fadeIn"
        duration={500}
        useNativeDriver
      >
        {/* Card Front */}
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.type}>{item.type}</Text>
        <Text style={styles.abstract}>{item.summary}</Text> {/* Show the summary initially */}
        <Text style={styles.date}>Published: {item.publication_date}</Text>
  
        {flippedCardIndex === index && (
          <View style={styles.cardBack}>
            {/* Pros and Cons Section */}
            <Text style={styles.cardBackText}>Pros:</Text>
            <Text style={styles.cardBackText}>{item.pros}</Text>
            <Text style={styles.cardBackText}>Cons:</Text>
            <Text style={styles.cardBackText}>{item.cons}</Text>
          </View>
        )}
  
        <TouchableOpacity
          style={styles.learnMoreButton}
          onPress={() => {
            console.log("Opening URL: ", item.html_url); // Debug log
            setWebViewUrl(item.html_url); // Open the WebView
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
});
