const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function requestData(method: string, prefix: string, data: FormData | null = null, jsonFormat = true, params = {}) {
    // Build query string from params object
    const queryString = new URLSearchParams(params).toString();
    const urlWithArgs = queryString ? `${BASE_URL}/${prefix}/?${queryString}` : `${BASE_URL}/${prefix}`;

    // Determine the request body and headers
    let body = null;
    let headers = {'Content-Type': ''};

    if (data) {
        if (jsonFormat) {
            // Handle JSON formatting
            body = JSON.stringify(data);
            headers['Content-Type'] = 'application/json';
        } else {
            body = data;
        }
    }

    // Send request
    const response = await fetch(urlWithArgs, {
        method: method,
        headers: headers,
        body: method === 'GET' ? null : body,
    });

    // Return response
    return response;
}

// Wrapper functions
export async function getData(prefix: string, params = {}) {
    return requestData('GET', prefix, null, false, params);
}

export async function deleteData(prefix: string, params = {}) {
    return requestData('DELETE', prefix, null, false, params);
}

export async function postData(prefix: string, data: FormData, params = {}) {
    return requestData('POST', prefix, data, false, params);
}

export async function putData(prefix: string, data: FormData, params = {}) {
    return requestData('PUT', prefix, data, false, params);
}

export async function patchData(prefix: string, data: FormData, params = {}) {
    return requestData('PATCH', prefix, data, false, params);
}

export function parseDateTime(dateString: string) {
    return new Date(dateString);
}

export function formatDateTime(date: Date) {
    // Format the date as YYYY-MM-DD and time as HH:MM:SS
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString();

    return `${formattedDate} ${formattedTime}`;
}

export function parseFormatDateTime(dateString: string) {
    return formatDateTime(parseDateTime(dateString));
}

export function toIsoDateString(date: Date | null): string {
    if (!date) return '';
    return date.toISOString().split('T')[0];
}