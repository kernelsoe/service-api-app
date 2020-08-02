gcloud compute instances create service-api-2 \
    --image-family=debian-10 \
    --image-project=debian-cloud \
    --machine-type=n1-standard-4  \
    --scopes userinfo-email,cloud-platform \
    --metadata app-location=asia-northeast3-a  \
    --metadata-from-file startup-script=gce/startup-script.sh \
    --zone asia-northeast3-a  \
    --tags http-server

gcloud compute instances get-serial-port-output service-api --zone asia-northeast3-a

gcloud compute firewall-rules create default-allow-http-8080 \
    --allow tcp:8080 \
    --source-ranges 0.0.0.0/0 \
    --target-tags http-server \
    --description "Allow port 8080 access to http-server"

gcloud compute instances list
