import Docker from 'dockerode';

export class DockerService {
    constructor() {
        this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    }

    async getContainers() {
        const containers = await this.docker.listContainers({ all: true });
        return (await Promise.all(containers.map(c => this.getEnhancedContainerData(c)))).filter(x => x);
    }

    async getEnhancedContainerData(containerInfo) {
        const container = this.docker.getContainer(containerInfo.Id);
        try {
            const data = await container.inspect();
            const health = data.State.Health?.Status || 'no healthcheck';
            let finalStatus = (['healthy', 'unhealthy', 'starting'].includes(health)) ? health : data.State.Status;

            return {
                id: data.Id,
                name: data.Name.replace('/', ''),
                imageName: data.Config.Image,
                imageId: data.Image,
                health: finalStatus,
                projectName: containerInfo.Labels['com.docker.compose.project'] || 'Standalone',
                serviceName: containerInfo.Labels['com.docker.compose.service'] || '',
                repoDigests: data.RepoDigests || []
            };
        } catch (e) {
            console.error(`Error inspecting container ${containerInfo.Id}:`, e);
            return null;
        }
    }

    async getRegistryToken(authUrl, service, repo) {
        const url = `${authUrl}?service=${service}&scope=repository:${repo}:pull`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch auth token: ${response.statusText}`);
        const data = await response.json();
        return data.token;
    }

    async checkUpdate(fullImageName, localImageId, localRepoDigests = []) {
        try {
            let [repo, tag] = fullImageName.split(':');
            if (!tag) tag = 'latest';

            let registryUrl = 'https://registry-1.docker.io/v2';
            let authUrl = 'https://auth.docker.io/token';
            let serviceName = 'registry.docker.io';

            if (repo.startsWith('ghcr.io/')) {
                registryUrl = 'https://ghcr.io/v2';
                authUrl = 'https://ghcr.io/token';
                serviceName = 'ghcr.io';
                repo = repo.replace('ghcr.io/', '');
            } else if (!repo.includes('/')) {
                repo = `library/${repo}`;
            }

            const token = await this.getRegistryToken(authUrl, serviceName, repo);
            const url = `${registryUrl}/${repo}/manifests/${tag}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.docker.distribution.manifest.v2+json'
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403 || response.status === 404) {
                    return { local: true };
                }
                console.error(`Failed to fetch manifest for ${repo}:${tag}: ${response.statusText}`);
                return { error: true };
            }

            const remoteDigest = response.headers.get('Docker-Content-Digest');
            if (!remoteDigest) return { error: true };

            const isUpToDate = localRepoDigests.some(d => d.includes(remoteDigest)) || localImageId.includes(remoteDigest);

            return { upToDate: isUpToDate };
        } catch (error) {
            console.error(`Error checking update for ${fullImageName}:`, error);
            return { error: true };
        }
    }
}
