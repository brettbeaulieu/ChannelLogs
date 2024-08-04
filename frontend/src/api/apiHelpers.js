const BASE_URL = 'http://localhost:8000/api';

async function requestData(method, prefix, data = null, jsonFormat = true, ...args) {
    const urlWithArgs = args.length > 0 ? `${BASE_URL}/${prefix}/${args.join('/')}` : `${BASE_URL}/${prefix}`;
    console.log(urlWithArgs);

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


export async function getData(prefix, ...args) {
    return requestData('GET', prefix, null, false, ...args);
}

export async function deleteData(prefix, ...args) {
    return requestData('DELETE', prefix, null, false, ...args);
}

export async function postData(prefix, data, ...args) {
    return requestData('POST', prefix, data, false, ...args);
}

export async function putData(prefix, data, ...args) {
    return requestData('PUT', prefix, data, false, ...args);
}

export async function patchData(prefix, data, ...args) {
    return requestData('PATCH', prefix, data, false, ...args);
}


export function parseDateTime(datetimeStr) {
    console.log("datetimeStr: " + datetimeStr);
    return new Date(datetimeStr);
}

export function formatDateTime(date) {
    // Format the date as YYYY-MM-DD and time as HH:MM:SS
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString();
    console.log("Hello " + formattedDate);

    return `${formattedDate} ${formattedTime}`;
}

export function parseFormatDateTime(datetimeStr) {
    return formatDateTime(parseDateTime(datetimeStr));
}

