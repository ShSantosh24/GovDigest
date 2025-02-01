import React, { useEffect, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context"; // Import SafeAreaView
import { fetchNewestPolicies } from "../api/PolicyApi";
import { WebView } from "react-native-webview";

export default function HomeScreen() {
  const [policies, setPolicies] = useState([]);
  const [filteredPolicies, setFilteredPolicies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCard, setExpandedCard] = useState(null);
  const [filterType, setFilterType] = useState(null);
  const [sortOrder, setSortOrder] = useState("newest");
  const [modalVisible, setModalVisible] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState(null);

  useEffect(() => {
    const getPolicies = async () => {
      try {
        const data = await fetchNewestPolicies();
        if (data && data.results) {
          const publishedPolicies = data.results.filter(
            (policy) => policy.publication_date
          );

          setPolicies(publishedPolicies);
          setFilteredPolicies(publishedPolicies);
        }
      } catch (error) {
        console.error("Error fetching policies:", error);
      }
    };

    getPolicies();
  }, []);

  const sortPolicies = (order) => {
    const sorted = [...filteredPolicies].sort((a, b) =>
      order === "newest"
        ? new Date(b.publication_date) - new Date(a.publication_date)
        : new Date(a.publication_date) - new Date(b.publication_date)
    );
    setFilteredPolicies(sorted);
    setSortOrder(order);
  };

  const filterByType = (type) => {
    if (!type) {
      setFilteredPolicies(policies);
    } else {
      const filtered = policies.filter((policy) => policy.type === type);
      setFilteredPolicies(filtered);
    }
    setFilterType(type);
    setModalVisible(false);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query) {
      setFilteredPolicies(policies);
    } else {
      const results = policies.filter(
        (policy) =>
          policy.title.toLowerCase().includes(query.toLowerCase()) ||
          policy.abstract.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredPolicies(results);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        setExpandedCard(expandedCard === item.document_number ? null : item.document_number)
      }
    >
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.type}>{item.type}</Text>
      {expandedCard === item.document_number ? (
        <>
          <Text style={styles.abstract}>{item.abstract}</Text>
          <TouchableOpacity
            style={styles.learnMoreButton}
            onPress={() => setWebViewUrl(item.html_url)}
          >
            <Text style={styles.learnMoreText}>Learn More!</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.abstract} numberOfLines={3}>
          {item.abstract}
        </Text>
      )}
      <Text style={styles.date}>Published: {item.publication_date}</Text>
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
            <Button title="Newest First" onPress={() => sortPolicies("newest")} />
            <Button title="Oldest First" onPress={() => sortPolicies("oldest")} />
            <Button title="All Types" onPress={() => filterByType(null)} />
            <Button title="Rules" onPress={() => filterByType("Rule")} />
            <Button title="Notices" onPress={() => filterByType("Notice")} />
            <Button title="Proposed Rules" onPress={() => filterByType("Proposed Rule")} />
            <Button title="Close" onPress={() => setModalVisible(false)} />
          </View>
        </Modal>

        <FlatList data={filteredPolicies} keyExtractor={(item) => item.document_number} renderItem={renderItem} />

        {webViewUrl && (
          <Modal visible={true} animationType="slide">
            <View style={{ flex: 1 }}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setWebViewUrl(null)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
              <WebView source={{ uri: webViewUrl }} />
            </View>
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
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  type: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007bff",
  },
  abstract: {
    fontSize: 14,
    color: "#333",
    marginTop: 5,
  },
  date: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6c757d",
    marginTop: 5,
  },
  learnMoreButton: {
    marginTop: 10,
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  learnMoreText: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalView: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    margin: 50,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
});

