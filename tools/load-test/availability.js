// Load on the public availability API, to watch the appointment-service autoscaler.
// Run: docker run --rm -i -e BASE_URL=http://<alb-dns> grafana/k6:2.2.0 run - < tools/load-test/availability.js
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL;
const DOCTORS = ["d1", "d2", "d3", "d4", "d5"];

export const options = {
  stages: [
    { duration: "1m", target: 20 },
    { duration: "4m", target: 20 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const doctor = DOCTORS[Math.floor(Math.random() * DOCTORS.length)];
  const res = http.get(`${BASE_URL}/api/public/availability?doctor_id=${doctor}`);
  check(res, { "status is 200": (r) => r.status === 200 });
  sleep(0.5);
}
