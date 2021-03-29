import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";

let config = new pulumi.Config();

const vpcName = config.require("vpcName");
const clusterName = config.require("clusterName");

// Create an EKS cluster with non-default configuration
const vpc = new awsx.ec2.Vpc(vpcName, { subnets: [{ type: "public" }] });
const cluster = new eks.Cluster(clusterName, {
vpcId: vpc.id,
    subnetIds: vpc.publicSubnetIds,
    desiredCapacity: 2,
    minSize: 1,
    maxSize: 2,
    storageClasses: "gp2",
    deployDashboard: false,
});

// If we're running inside Octopus, emit a service message to output the cluster URL 
if (config.requireBoolean("runningViaOctopus")) {
    console.log(
        pulumi.interpolate `set_octopusvariable "k8sClusterUrl" "${cluster.core.endpoint}"`
    )
}

// Export the clusters' kubeconfig.
export const kubeconfig = cluster.kubeconfig