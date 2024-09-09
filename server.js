import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
const app = express();
app.use(express.json());

// Set the root directory to serve static files like index.html, styles.css, and app.js
const rootDir = path.resolve();

// Serve static files (HTML, CSS, JS)
app.use(express.static(rootDir));

// API settings
const apiToken = process.env.PIPEDRIVE_API_KEY;
const domain = 'https://pipedrivetest9.pipedrive.com';
const personApiEndpoint = `${domain}/v1/persons`;
const organizationApiEndpoint = `${domain}/v1/organizations`;

// Function to handle the merge operation
async function handleMerge(type, mergeBy) {
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

    const response = await fetch(`${apiEndpoint}?api_token=${apiToken}`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Failed to fetch data: ${data.error}`);
    }

    const records = data.data;
    const duplicates = findDuplicatesFn(records, mergeBy);

    for (const [key, recordsList] of Object.entries(duplicates)) {
        const mainRecord = recordsList[0];
        const duplicateIds = recordsList.slice(1).map(r => r.id);
        await mergeFn(mainRecord.id, duplicateIds);
    }

    return { message: 'Merge successful' };
}

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

        for (let value of values) {
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
        } catch (error) {
            console.error('Error merging persons:', error);
        }
    }
}

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
        } catch (error) {
            console.error('Error merging organizations:', error);
        }
    }
}

// Express route to handle the merge request
app.post('/api/merge', async (req, res) => {
    const { type, mergeBy } = req.body;

    try {
        const result = await handleMerge(type, mergeBy);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
