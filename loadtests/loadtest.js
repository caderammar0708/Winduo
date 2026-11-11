import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 500 },
    { duration: '1m', target: 500 },
    { duration: '30s', target: 700 },
    { duration: '1m', target: 700 },
    { duration: '30s', target: 0 },
  ],
};

const BASE_URL = 'https://winduo.online';

export default function () {
  let res = http.get(`${BASE_URL}/`);
  check(res, { 'homepage status is 200': (r) => r.status === 200 });
  sleep(1);

  res = http.get(`${BASE_URL}/instructors`);
  check(res, { 'instructors page status is 200': (r) => r.status === 200 });
  sleep(2);
}