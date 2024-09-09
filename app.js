require('dotenv').config();

const apiToken = dfe1458e2198b13790d802815e1300d88d178a9e//process.env.API_TOKEN;
const domain = 'https://pipedrivetest9.pipedrive.com';

// Set up the API endpoints
const personApiEndpoint = `${domain}/v1/persons`;
const organizationApiEndpoint = `${domain}/v1/organizations`;

// Function to handle the merge operation
async function handleMerge(type, mergeBy) {
    try {
        let apiEndpoint;
        let findDuplicatesFn;
        let mergeFn;

        if (type === 'persons') {
            apiEndpoint = personApiEndpoint;
            findDuplicatesFn = findPersonDuplicates;
            mergeFn = mergePersons;
        } else if (type === 'organizations') {
            apiEndpoint = organizationApiEndpoint;
            findDuplicatesFn = findOrganizationDuplicates;
            mergeFn = mergeOrganizations;
        } else {
            throw new Error('Invalid merge type selected.');
        }

        // Fetch all records from the API
        const response = await fetch(`${apiEndpoint}?api_token=${apiToken}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${data.error}`);
        }

        // Process the data
        const records = data.data;

        // Find duplicates based on the selected merge type
        const duplicates = findDuplicatesFn(records, mergeBy);

        // Merge duplicates
        for (const [key, recordsList] of Object.entries(duplicates)) {
            const mainRecord = recordsList[0];
            const duplicateIds = recordsList.slice(1).map(r => r.id);
            await mergeFn(mainRecord.id, duplicateIds);
        }
    } catch (error) {
        console.error('Error during merge operation:', error);
    }
}

// Function to find person duplicates based on type (email, name, or phone)
function findPersonDuplicates(persons, type) {
    const typeDict = {};

    for (const person of persons) {
        let values = [];

        if (type === 'email') {
            values = person.email || [];
        } else if (type === 'name') {
            values = [person.name];
        } else if (type === 'phone') {
            values = person.phone || [];
        }

        if (!Array.isArray(values)) {
            values = [values];
        }

        for (const value of values) {
            if (typeof value === 'object') {
                value = value.value;
            }

            if (value) {
                if (!typeDict[value]) {
                    typeDict[value] = [];
                }
                typeDict[value].push(person);
            }
        }
    }

    const mostRecentDict = {};

    for (const [key, personsList] of Object.entries(typeDict)) {
        personsList.sort((a, b) => new Date(b.update_time || b.add_time) - new Date(a.update_time || a.add_time));
        mostRecentDict[key] = personsList;
    }

    return Object.fromEntries(
        Object.entries(mostRecentDict).filter(([key, persons]) => persons.length > 1)
    );
}

// Function to merge persons
async function mergePersons(mainPersonId, duplicatePersonIds) {
    for (const duplicatePersonId of duplicatePersonIds) {
        try {
            const url = `${personApiEndpoint}/${duplicatePersonId}/merge?api_token=${apiToken}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ merge_with_id: mainPersonId })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(`Failed to merge persons: ${data.error}`);
            }

            console.log(`Successfully merged person ${duplicatePersonId} into ${mainPersonId}`);
        } catch (error) {
            console.error('Error merging persons:', error);
        }
    }
}

// Function to find organization duplicates based on type (name or address)
function findOrganizationDuplicates(organizations, type) {
    const typeDict = {};

    for (const organization of organizations) {
        let values = [];

        if (type === 'name') {
            values = [organization.name];
        } else if (type === 'address') {
            values = [organization.address || ''];
        }

        if (!Array.isArray(values)) {
            values = [values];
        }

        for (const value of values) {
            if (typeof value === 'object') {
                value = value.value;
            }

            if (value) {
                if (!typeDict[value]) {
                    typeDict[value] = [];
                }
                typeDict[value].push(organization);
            }
        }
    }

    const mostRecentDict = {};

    for (const [key, organizationsList] of Object.entries(typeDict)) {
        organizationsList.sort((a, b) => new Date(b.update_time || b.add_time) - new Date(a.update_time || a.add_time));
        mostRecentDict[key] = organizationsList;
    }

    return Object.fromEntries(
        Object.entries(mostRecentDict).filter(([key, organizations]) => organizations.length > 1)
    );
}

// Function to merge organizations
async function mergeOrganizations(mainOrganizationId, duplicateOrganizationIds) {
    for (const duplicateOrganizationId of duplicateOrganizationIds) {
        try {
            const url = `${organizationApiEndpoint}/${duplicateOrganizationId}/merge?api_token=${apiToken}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ merge_with_id: mainOrganizationId })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(`Failed to merge organizations: ${data.error}`);
            }

            console.log(`Successfully merged organization ${duplicateOrganizationId} into ${mainOrganizationId}`);
        } catch (error) {
            console.error('Error merging organizations:', error);
        }
    }
}

// Function to update the "Merge by" options based on the selected "Merge Type"
function updateMergeByOptions() {
    const mergeType = document.getElementById('mergeType').value;
    const mergeBySelect = document.getElementById('mergeBy');

    let options = [];

    if (mergeType === 'persons') {
        options = [
            { value: 'email', text: 'Email' },
            { value: 'name', text: 'Name' },
            { value: 'phone', text: 'Phone' }
        ];
    } else if (mergeType === 'organizations') {
        options = [
            { value: 'name', text: 'Name' },
            { value: 'address', text: 'Address' }
        ];
    }

    // Clear existing options
    mergeBySelect.innerHTML = '';

    // Add new options
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.text;
        mergeBySelect.appendChild(opt);
    });
}

// Event listener for the merge type dropdown
document.getElementById('mergeType').addEventListener('change', updateMergeByOptions);

// Event listener for the merge button
document.getElementById('mergeBtn').addEventListener('click', () => {
    const mergeType = document.getElementById('mergeType').value;
    const mergeBy = document.getElementById('mergeBy').value;
    handleMerge(mergeType, mergeBy);
});

// Initialize options on page load
updateMergeByOptions();
