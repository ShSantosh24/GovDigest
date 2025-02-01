// Define the endpoint URL for fetching the most recent policies
const url = 'https://www.federalregister.gov/api/v1/documents.json?per_page=5&sort=published+desc'; // per_page=5 fetches the latest 5 documents

// Function to fetch the latest policies
export async function fetchNewestPolicies() {
  try {
    const response = await fetch(url);
    
    // Check if the response is successful
    if (response.ok) {
      const data = await response.json();
      console.log('Newest Policies:', data); 
      return data // Log the data to the console for inspection
      
      // You can use this data to display the newest policies in your app
    } else {
      console.log('Failed to fetch data', response.status);
    } 
  } catch (error) {
    console.error('Error fetching newest policies:', error);
  }
}
