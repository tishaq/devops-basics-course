# Quiz 07: Container Orchestration with Kubernetes

Answer all questions. For multiple-choice questions, select the single best answer. For short-answer questions, respond in one to three sentences.

**Q1.** Which statement best describes the relationship between a Deployment, a ReplicaSet, and Pods?

- A. A Pod manages ReplicaSets, which manage Deployments
- B. A Deployment manages ReplicaSets, which manage Pods
- C. A Deployment and a ReplicaSet each manage Pods independently
- D. A ReplicaSet manages Deployments, which schedule Pods onto nodes

**Q2.** A Pod's readiness probe starts failing, but its liveness probe keeps passing. What does Kubernetes do?

- A. Restarts the container immediately
- B. Deletes the Pod and schedules a replacement
- C. Removes the Pod from the Service's endpoints without restarting it
- D. Marks the node as unschedulable

**Q3.** A container repeatedly fails its liveness probe. What happens?

- A. The Pod is removed from Service endpoints but keeps running
- B. The kubelet restarts the container
- C. The scheduler moves the Pod to another node
- D. Nothing until an administrator intervenes

**Q4.** Short answer: Your app runs in a Pod with `requests: memory: 64Mi` and `limits: memory: 128Mi`. What happens if the container's memory usage grows to 200Mi, and how would you notice it in `kubectl describe pod`?

**Q5.** What is the primary purpose of resource *requests* (as distinct from limits)?

- A. They cap the maximum CPU and memory a container may use
- B. They tell the scheduler how much capacity to reserve when placing the Pod
- C. They configure the container's swap space
- D. They set the minimum number of replicas

**Q6.** Short answer: You delete one Pod belonging to a Deployment with `replicas: 3`, and a new Pod appears seconds later. Explain the mechanism that caused this, using the terms "desired state" and "actual state".

**Q7.** A Service of type ClusterIP exists and its Pods are `Running` and ready, but no traffic reaches them. `kubectl get endpoints` for the Service shows no addresses. What is the most likely cause?

- A. The Service's `port` and `targetPort` are different numbers
- B. The Service's label selector does not match the Pod labels
- C. ClusterIP Services cannot route traffic to Pods
- D. The Pods lack a liveness probe

**Q8.** Which command watches a rolling update until it completes?

- A. `kubectl get deployment -w --until=done`
- B. `kubectl rollout status deployment/devops-demo-app`
- C. `kubectl describe rollout devops-demo-app`
- D. `kubectl logs deployment/devops-demo-app -f`

**Q9.** Short answer: Why is `kubectl rollout undo` typically much faster than deploying a fixed image, and what Kubernetes object makes this possible?

**Q10.** In the lab you set `imagePullPolicy: Never` on the container. Why was this necessary?

- A. It prevents Kubernetes from updating the image without approval
- B. The image was loaded directly onto the kind nodes and no registry holds it, so a pull attempt would fail
- C. It disables the readiness probe during startup
- D. kind clusters do not support pulling public images

---

## Answer Key

**Q1.** B — A Deployment creates and manages ReplicaSets (one per revision), and each ReplicaSet keeps the desired number of Pods running.

**Q2.** C — A failing readiness probe only removes the Pod from Service endpoints so it stops receiving traffic; the container is not restarted.

**Q3.** B — Repeated liveness failures cause the kubelet to restart the container, which is the recovery mechanism for hung or deadlocked processes.

**Q4.** The container is killed by the kernel OOM killer for exceeding its memory limit and is restarted; `kubectl describe pod` shows the last state as `OOMKilled` and an incremented restart count.

**Q5.** B — Requests are the scheduler's placement input, reserving guaranteed capacity on a node; limits (not requests) cap usage.

**Q6.** The Deployment's ReplicaSet has a desired state of 3 Pods; deleting one made the actual state 2, and the ReplicaSet controller's reconciliation loop observed the gap and created a new Pod to make actual state match desired state again.

**Q7.** B — Empty endpoints with healthy Pods almost always means the Service selector does not match the Pod template labels, so the Service has no Pods to route to.

**Q8.** B — `kubectl rollout status` blocks and reports progress until the Deployment's rollout finishes (or fails).

**Q9.** Undo simply re-activates the previous revision's ReplicaSet, which the Deployment retained in its revision history, so no image build, push, or load is required.

**Q10.** B — `kind load docker-image` places the image directly on the cluster nodes; since no registry serves it, the default pull policy would fail with `ErrImagePull`, so the kubelet must be told to use the local image only.
