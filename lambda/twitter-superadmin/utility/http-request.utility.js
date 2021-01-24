const axios = require('axios');

async function sendPostRequest(
  requestUrl,
  header,
  body
) {
  const apiResponse = await axios({
    method: 'post',
    url: requestUrl,
    headers: header,
    data: body
  });
  return apiResponse;
}

async function sendDeleteRequest(
  requestUrl,
  header,
  queryParams
) {
  const apiResponse = await axios({
    method: 'delete',
    url: requestUrl,
    headers: header,
    params: queryParams
  });
  return apiResponse;
}

module.exports = { sendPostRequest, sendDeleteRequest };
