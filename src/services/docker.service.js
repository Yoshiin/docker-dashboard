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
            if (data.State.Status === 'exited' && data.State.ExitCode === 0) {
                finalStatus = 'stopped';
            }

            let repoDigests = [];
            try {
                const imageData = await this.docker.getImage(data.Image).inspect();
                repoDigests = imageData.RepoDigests || [];
            } catch (imageErr) {
                console.warn(`Could not inspect image ${data.Image} for container ${data.Name}:`, imageErr.message);
            }

            return {
                id: data.Id,
                name: data.Name.replace('/', ''),
                imageName: data.Config.Image,
                imageId: data.Image,
                health: finalStatus,
                projectName: containerInfo.Labels['com.docker.compose.project'] || 'Standalone',
                serviceName: containerInfo.Labels['com.docker.compose.service'] || 'Standalone',
                repoDigests: repoDigests
            };
        } catch (e) {
            console.error(`Error inspecting container ${containerInfo.Id}:`, e);
            return null;
        }
    }

    async getRegistryToken(realm, service, scope) {
        try {
            const url = `${realm}?service=${encodeURIComponent(service)}&scope=${encodeURIComponent(scope)}`;
            const response = await fetch(url);
            if (!response.ok) return null;
            const data = await response.json();
            return data.token || data.access_token;
        } catch (e) {
            console.error(`Error fetching registry token from ${realm}:`, e);
            return null;
        }
    }

    parseImageName(name) {
        let registry = 'registry-1.docker.io';
        let repo = name;
        let tag = 'latest';

        if (name.includes(':')) {
            const lastColon = name.lastIndexOf(':');
            const potentialTag = name.substring(lastColon + 1);
            if (!potentialTag.includes('/')) {
                tag = potentialTag;
                repo = name.substring(0, lastColon);
            }
        }

        const slashIndex = repo.indexOf('/');
        if (slashIndex !== -1) {
            const firstSegment = repo.substring(0, slashIndex);
            if (firstSegment.includes('.') || firstSegment.includes(':') || firstSegment === 'localhost') {
                registry = firstSegment;
                repo = repo.substring(slashIndex + 1);
            }
        }

        if (registry === 'registry-1.docker.io' && !repo.includes('/')) {
            repo = `library/${repo}`;
        }

        return { registry, repo, tag };
    }

    parseAuthenticateHeader(header) {
        const params = {};
        const match = header.match(/Bearer\s+(.+)/i);
        if (match) {
            match[1].split(',').forEach(part => {
                const [key, value] = part.split('=');
                if (key && value) {
                    params[key.trim()] = value.replace(/"/g, '').trim();
                }
            });
        }
        return params;
    }

    getRegistryEndpoints(registry, repo, tag) {
        if (registry === 'registry-1.docker.io' || registry === 'docker.io') {
            return {
                authUrl: `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repo}:pull`,
                manifestUrl: `https://registry-1.docker.io/v2/${repo}/manifests/${tag}`
            };
        }
        if (registry === 'ghcr.io' || registry === 'lscr.io') {
            return {
                authUrl: `https://ghcr.io/token?scope=repository:${repo}:pull`,
                manifestUrl: `https://${registry}/v2/${repo}/manifests/${tag}`
            };
        }
        return {
            authUrl: `https://${registry}/token?service=${registry}&scope=repository:${repo}:pull`,
            manifestUrl: `https://${registry}/v2/${repo}/manifests/${tag}`
        };
    }

    async fetchAccessToken(authUrl, registry) {
        try {
            const tokenRes = await fetch(authUrl);
            if (!tokenRes.ok) {
                console.error(`Auth failed for ${registry}: ${tokenRes.status}`);
                return null;
            }
            const data = await tokenRes.json();
            return data.token || data.access_token;
        } catch (e) {
            console.error(`Error fetching token for ${registry}:`, e.message);
            return null;
        }
    }

    extractDigest(response) {
        let digest = response.headers.get('docker-content-digest');
        if (!digest) {
            const etag = response.headers.get('etag');
            if (etag) digest = etag.replace(/"/g, '');
        }
        return digest;
    }

    async checkUpdate(fullImageName, localRepoDigests = []) {
        if (!localRepoDigests || localRepoDigests.length === 0) {
            return { local: true };
        }

        try {
            const { registry, repo, tag } = this.parseImageName(fullImageName);
            const { authUrl, manifestUrl } = this.getRegistryEndpoints(registry, repo, tag);

            const token = await this.fetchAccessToken(authUrl, registry);
            if (!token) return { local: true };

            const response = await fetch(manifestUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.oci.image.index.v1+json'
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 404) return { local: true };
                return { error: true };
            }

            const remoteDigest = this.extractDigest(response);
            if (!remoteDigest) return { error: true };

            const isUpToDate = localRepoDigests.some(d => d.includes(remoteDigest));
            return { upToDate: isUpToDate };

        } catch (error) {
            console.error(`Erreur checkUpdate (${fullImageName}):`, error.message);
            return { error: true };
        }
    }
}
