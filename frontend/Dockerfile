FROM nginxinc/nginx-unprivileged:1.30.5-alpine3.24
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css app.js /usr/share/nginx/html/
EXPOSE 8080
