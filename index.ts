import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";

let config = new pulumi.Config();

const vpcName = config.require("vpcName");
const clusterNamePrefix = config.require("clusterNamePrefix");

// Create an EKS cluster with non-default configuration
const vpc = new awsx.ec2.Vpc(vpcName, { subnets: [{ type: "public" }] });
const cluster = new eks.Cluster(clusterNamePrefix, {
vpcId: vpc.id,
    subnetIds: vpc.publicSubnetIds,
    desiredCapacity: 2,
    minSize: 1,
    maxSize: 2,
    storageClasses: "gp2",
    deployDashboard: false,
});

// Export the clusters' kubeconfig.
export const kubeconfig = cluster.kubeconfig

// Export the cluster details
export const clusterUrl = cluster.core.endpoint
export const clusterName = cluster.core.cluster.name; 

const k8sProvider = new k8s.Provider("k8sProvider", {kubeconfig: kubeconfig} );

// Deploy the guestbook application to the k8s cluster

const redisImage = config.require("redisImage");
const guestbookImage = config.require("guestbookImage");

//
// REDIS LEADER.
//

const redisLeaderLabels = { app: "redis-leader" };
const redisLeaderDeployment = new k8s.apps.v1.Deployment("redis-leader", {
    spec: {
        selector: { matchLabels: redisLeaderLabels },
        template: {
            metadata: { labels: redisLeaderLabels },
            spec: {
                containers: [
                    {
                        name: "redis-leader",
                        image: "redis",
                        resources: { requests: { cpu: "100m", memory: "100Mi" } },
                        ports: [{ containerPort: 6379 }],
                    },
                ],
            },
        },
    },
}, { provider: k8sProvider });

const redisLeaderService = new k8s.core.v1.Service("redis-leader", {
    metadata: {
        name: "redis-leader",
        labels: redisLeaderDeployment.metadata.labels,
    },
    spec: {
        ports: [{ port: 6379, targetPort: 6379 }],
        selector: redisLeaderDeployment.spec.template.metadata.labels,
    },
}, { provider: k8sProvider });


//
// FRONTEND
//

const frontendLabels = { app: "frontend" };
const frontendDeployment = new k8s.apps.v1.Deployment("frontend", {
    spec: {
        selector: { matchLabels: frontendLabels },
        replicas: 3,
        template: {
            metadata: { labels: frontendLabels },
            spec: {
                containers: [
                    {
                        name: "frontend",
                        image: "pulumi/guestbook-php-redis",
                        resources: { requests: { cpu: "100m", memory: "100Mi" } },
                        // If your cluster config does not include a dns service, then to instead access an environment
                        // variable to find the master service's host, change `value: "dns"` to read `value: "env"`.
                        env: [{ name: "GET_HOSTS_FROM", value: "dns" /* value: "env"*/ }],
                        ports: [{ containerPort: 80 }],
                    },
                ],
            },
        },
    },
}, { provider: k8sProvider});

const frontendService = new k8s.core.v1.Service("frontend", {
    metadata: {
        labels: frontendDeployment.metadata.labels,
        name: "frontend",
    },
    spec: {
        type: "LoadBalancer",
        ports: [{ port: 80 }],
        selector: frontendDeployment.spec.template.metadata.labels,
    },
}, {provider: k8sProvider });

// Export the frontend IP.
export let frontendIp: pulumi.Output<string>;
frontendIp = frontendService.status.loadBalancer.ingress[0].ip;