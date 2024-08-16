const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function requestData(method, prefix, data = null, jsonFormat = true, params = {}) {
    // Build query string from params object
    const queryString = new URLSearchParams(params).toString();
    const urlWithArgs = queryString ? `${BASE_URL}/${prefix}/?${queryString}` : `${BASE_URL}/${prefix}`;

    // Determine the request body and headers
    let body = null;
    let headers = {};

    if (data) {
        if (jsonFormat) {
            // Handle JSON formatting
            body = JSON.stringify(data);
            headers['Content-Type'] = 'application/json';
        } else {
            body = data;
        }
    }

    try {
        // Send request
        const response = await fetch(urlWithArgs, {
            method: method,
            headers: headers,
            body: method === 'GET' ? null : body,
        });

        // Read response
        const response_msg = method === 'DELETE' ? await response.text() : await response.json();

        // Read error, if response isn't ok
        if (!response.ok) {
            throw new Error(`${response.status} ${response_msg["error"]}`);
        }

        // Return response
        return response_msg;

    } catch (error) {
        // Alert to error
        console.error(`Error ${method} data:`, error);
        alert(error);
    }
}

// Wrapper functions
export async function getData(prefix, params = {}) {
    return requestData('GET', prefix, null, false, params);
}

export async function deleteData(prefix, params = {}) {
    return requestData('DELETE', prefix, null, false, params);
}

export async function postData(prefix, data, params = {}) {
    return requestData('POST', prefix, data, false, params);
}

export async function putData(prefix, data, params = {}) {
    return requestData('PUT', prefix, data, false, params);
}

export async function patchData(prefix, data, params = {}) {
    return requestData('PATCH', prefix, data, false, params);
}

export function parseDateTime(datetimeStr) {
    return new Date(datetimeStr);
}

export function formatDateTime(date) {
    // Format the date as YYYY-MM-DD and time as HH:MM:SS
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString();

    return `${formattedDate} ${formattedTime}`;
}

export function parseFormatDateTime(datetimeStr) {
    return formatDateTime(parseDateTime(datetimeStr));
}
