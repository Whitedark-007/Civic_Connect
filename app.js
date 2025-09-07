class CivicConnectApp {
    constructor() {
        this.currentView = 'citizen';
        this.currentSection = 'landing';
        this.currentAdminTab = 'dashboard';
        this.issues = this.loadIssues() || [];
        this.userIssues = this.loadUserIssues() || [];

        this.currentLocation = null;
        this.locationAccuracy = null;
        this.isDetectingLocation = false;
        this.watchId = null;
        this.photoUploaded = false;
        this.locationDetected = false;
        this.detectionTimestamp = null;
        this.detectedFullAddress = null;
        this.currentPhotoData = null;

        // Map instances
        this.reportMap = null;
        this.communityMap = null;
        this.fieldMap = null;
        this.currentRoute = null;
        this.fieldWorkerLocation = null;
        this.currentNavigationIssue = null;
        this.navigationWatchId = null;

        // Map markers
        this.issueMarkers = [];
        this.fieldWorkerMarker = null;

        this.gpsSettings = {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 60000
        };

        this.coordinateBounds = {
            latitude: { min: -90, max: 90 },
            longitude: { min: -180, max: 180 }
        };

        this.charts = {};
        this.locationDatabase = this.initializeLocationDatabase();

        this.init();
    }

    initializeLocationDatabase() {
        return [
            {
                lat: { min: 12.0, max: 14.0 },
                lng: { min: 79.0, max: 81.0 },
                addresses: [
                    "Sriperumbudur, Kanchipuram, Tamil Nadu, 603202, India",
                    "Kanchipuram, Tamil Nadu, 631502, India", 
                    "Chengalpattu, Tamil Nadu, 603001, India",
                    "Tambaram, Chennai, Tamil Nadu, 600045, India"
                ]
            },
            {
                lat: { min: 12.8, max: 13.2 },
                lng: { min: 80.1, max: 80.3 },
                addresses: [
                    "T. Nagar, Chennai, Tamil Nadu, 600017, India",
                    "Anna Nagar, Chennai, Tamil Nadu, 600040, India",
                    "Velachery, Chennai, Tamil Nadu, 600042, India", 
                    "Adyar, Chennai, Tamil Nadu, 600020, India"
                ]
            },
            {
                lat: { min: 28.4, max: 28.8 },
                lng: { min: 77.0, max: 77.4 },
                addresses: [
                    "Connaught Place, New Delhi, Delhi, 110001, India",
                    "Karol Bagh, New Delhi, Delhi, 110005, India",
                    "Lajpat Nagar, New Delhi, Delhi, 110024, India",
                    "Dwarka, New Delhi, Delhi, 110078, India"
                ]
            }
        ];
    }

    generateDetailedAddress(lat, lng) {
        for (let location of this.locationDatabase) {
            if (lat >= location.lat.min && lat <= location.lat.max &&
                lng >= location.lng.min && lng <= location.lng.max) {
                const randomIndex = Math.floor(Math.random() * location.addresses.length);
                return location.addresses[randomIndex];
            }
        }

        const genericAddresses = [
            `${this.generateAreaName()}, ${this.generateCityName()}, ${this.generateStateName()}, ${this.generatePincode()}, India`,
            `${this.generateStreetName()}, ${this.generateCityName()}, ${this.generateStateName()}, ${this.generatePincode()}, India`
        ];

        return genericAddresses[Math.floor(Math.random() * genericAddresses.length)];
    }

    generateAreaName() {
        const areas = ["Gandhi Nagar", "Nehru Colony", "Indira Nagar", "Rajiv Chowk", "MG Road", "Station Road"];
        return areas[Math.floor(Math.random() * areas.length)];
    }

    generateCityName() {
        const cities = ["Vijayawada", "Coimbatore", "Madurai", "Tiruchirappalli", "Vellore", "Erode"];
        return cities[Math.floor(Math.random() * cities.length)];
    }

    generateStateName() {
        const states = ["Tamil Nadu", "Karnataka", "Andhra Pradesh", "Telangana", "Kerala"];
        return states[Math.floor(Math.random() * states.length)];
    }

    generatePincode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindEvents());
        } else {
            this.bindEvents();
        }

        this.checkGeolocationSupport();
        this.updateStats();
        this.renderUserIssues();
        this.showSection('landing');
    }

    bindEvents() {
        try {
            // Navigation events
            document.getElementById('viewToggle')?.addEventListener('click', () => this.toggleView());
            document.getElementById('reportIssueBtn')?.addEventListener('click', () => this.showSection('reportIssue'));
            document.getElementById('viewMapBtn')?.addEventListener('click', () => this.showSection('communityMap'));
            document.getElementById('backToLanding')?.addEventListener('click', () => this.showSection('landing'));
            document.getElementById('backToLandingFromTrack')?.addEventListener('click', () => this.showSection('landing'));
            document.getElementById('backToLandingFromMap')?.addEventListener('click', () => this.showSection('landing'));

            // Location detection events
            document.getElementById('detectLocationBtn')?.addEventListener('click', () => this.detectLocation());
            document.getElementById('refreshLocationBtn')?.addEventListener('click', () => this.refreshLocation());
            document.getElementById('useManualLocation')?.addEventListener('click', () => this.useManualLocation());
            document.getElementById('manualLat')?.addEventListener('input', () => this.validateManualCoordinates());
            document.getElementById('manualLng')?.addEventListener('input', () => this.validateManualCoordinates());

            // Form events
            document.getElementById('issueForm')?.addEventListener('submit', (e) => this.submitIssue(e));
            document.getElementById('issuePhoto')?.addEventListener('change', (e) => this.previewPhoto(e));

            // Admin tab events
            document.getElementById('dashboardTab')?.addEventListener('click', () => this.showAdminTab('dashboard'));
            document.getElementById('issuesTab')?.addEventListener('click', () => this.showAdminTab('issues'));
            document.getElementById('fieldMapTab')?.addEventListener('click', () => this.showAdminTab('fieldMap'));
            document.getElementById('analyticsTab')?.addEventListener('click', () => this.showAdminTab('analytics'));

            // Filter events
            document.getElementById('statusFilter')?.addEventListener('change', () => this.filterAdminIssues());
            document.getElementById('priorityFilter')?.addEventListener('change', () => this.filterAdminIssues());
            document.getElementById('priorityMapFilter')?.addEventListener('change', () => this.filterMapIssues());

            // Map control events
            document.getElementById('refreshMapBtn')?.addEventListener('click', () => this.refreshCommunityMap());
            document.getElementById('centerMapBtn')?.addEventListener('click', () => this.centerMapOnUser());
            document.getElementById('getMyLocationBtn')?.addEventListener('click', () => this.getFieldWorkerLocation());
            document.getElementById('showAllIssuesBtn')?.addEventListener('click', () => this.showAllIssuesOnMap());
            document.getElementById('nearestIssueBtn')?.addEventListener('click', () => this.findNearestIssue());
            document.getElementById('routeOptimizeBtn')?.addEventListener('click', () => this.optimizeRoute());
            document.getElementById('clearRouteBtn')?.addEventListener('click', () => this.clearRoute());

            // Modal events
            document.getElementById('closeSuccessModal')?.addEventListener('click', () => this.hideModal('successModal'));
            document.getElementById('closeErrorModal')?.addEventListener('click', () => this.hideModal('errorModal'));
            document.getElementById('closeImageModal')?.addEventListener('click', () => this.hideModal('imageModal'));
            document.getElementById('closeDirectionModal')?.addEventListener('click', () => this.hideModal('directionModal'));
            document.getElementById('openInMapsBtn')?.addEventListener('click', () => this.openInMapsApp());
            document.getElementById('startNavigationBtn')?.addEventListener('click', () => this.startNavigation());

            console.log('All event listeners bound successfully');
        } catch (error) {
            console.error('Error binding events:', error);
        }
    }

    // ===== MAP FUNCTIONALITY =====

    initializeReportMap() {
        if (!this.currentLocation) return;

        const mapContainer = document.getElementById('reportMapPreview');
        if (!mapContainer) return;

        try {
            if (this.reportMap) {
                this.reportMap.remove();
            }

            this.reportMap = L.map('reportMapPreview').setView([this.currentLocation.latitude, this.currentLocation.longitude], 16);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.reportMap);

            L.marker([this.currentLocation.latitude, this.currentLocation.longitude])
                .addTo(this.reportMap)
                .bindPopup('Your Issue Location')
                .openPopup();

            setTimeout(() => {
                this.reportMap.invalidateSize();
            }, 100);
        } catch (error) {
            console.error('Error initializing report map:', error);
        }
    }

    initializeCommunityMap() {
        const mapContainer = document.getElementById('communityMapContainer');
        if (!mapContainer) return;

        try {
            if (this.communityMap) {
                this.communityMap.remove();
            }

            // Default center (Chennai)
            const defaultLat = 13.0827;
            const defaultLng = 80.2707;

            this.communityMap = L.map('communityMapContainer').setView([defaultLat, defaultLng], 12);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.communityMap);

            this.addIssueMarkersToCommunityMap();

            setTimeout(() => {
                this.communityMap.invalidateSize();
            }, 100);
        } catch (error) {
            console.error('Error initializing community map:', error);
        }
    }

    initializeFieldMap() {
        const mapContainer = document.getElementById('fieldMapContainer');
        if (!mapContainer) return;

        try {
            if (this.fieldMap) {
                this.fieldMap.remove();
            }

            const defaultLat = 13.0827;
            const defaultLng = 80.2707;

            this.fieldMap = L.map('fieldMapContainer').setView([defaultLat, defaultLng], 12);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.fieldMap);

            this.addIssueMarkersToFieldMap();

            setTimeout(() => {
                this.fieldMap.invalidateSize();
            }, 100);
        } catch (error) {
            console.error('Error initializing field map:', error);
        }
    }

    addIssueMarkersToCommunityMap() {
        if (!this.communityMap) return;

        this.issues.forEach(issue => {
            const color = this.getMarkerColor(issue.priority);
            const marker = L.circleMarker([issue.location.latitude, issue.location.longitude], {
                color: color,
                fillColor: color,
                fillOpacity: 0.7,
                radius: 8
            }).addTo(this.communityMap);

            marker.bindPopup(`
                <div class="marker-popup">
                    <h4>${issue.type}</h4>
                    <p><strong>Priority:</strong> ${issue.priority}</p>
                    <p><strong>Status:</strong> ${issue.status}</p>
                    <p><strong>Location:</strong> ${issue.location.address}</p>
                    <p><strong>Description:</strong> ${issue.description}</p>
                    <p><strong>Reported:</strong> ${new Date(issue.timestamp).toLocaleDateString()}</p>
                </div>
            `);
        });
    }

    addIssueMarkersToFieldMap() {
        if (!this.fieldMap) return;

        // Clear existing markers
        this.issueMarkers.forEach(marker => {
            this.fieldMap.removeLayer(marker);
        });
        this.issueMarkers = [];

        this.issues.forEach(issue => {
            if (issue.status === 'Resolved') return;

            const color = this.getMarkerColor(issue.priority);
            const marker = L.circleMarker([issue.location.latitude, issue.location.longitude], {
                color: color,
                fillColor: color,
                fillOpacity: 0.8,
                radius: 10,
                weight: 3
            }).addTo(this.fieldMap);

            marker.issueData = issue;

            marker.bindPopup(`
                <div class="field-marker-popup">
                    <h4>${issue.type} - ${issue.id}</h4>
                    <p><strong>Priority:</strong> <span class="priority-${issue.priority.toLowerCase()}">${issue.priority}</span></p>
                    <p><strong>Status:</strong> ${issue.status}</p>
                    <p><strong>Address:</strong> ${issue.location.address}</p>
                    <p><strong>Description:</strong> ${issue.description}</p>
                    <div class="popup-actions">
                        <button onclick="app.getDirectionsToIssue('${issue.id}')" class="btn btn--primary btn--sm">Get Directions</button>
                        <button onclick="app.showIssueDetails('${issue.id}')" class="btn btn--secondary btn--sm">View Photo</button>
                    </div>
                </div>
            `);

            this.issueMarkers.push(marker);
        });
    }

    getMarkerColor(priority) {
        switch(priority) {
            case 'Emergency': return '#dc2626';
            case 'High': return '#ea580c'; 
            case 'Medium': return '#d97706';
            case 'Low': return '#059669';
            default: return '#6b7280';
        }
    }

    // ===== NAVIGATION FUNCTIONALITY =====

    getDirectionsToIssue(issueId) {
        const issue = this.issues.find(i => i.id === issueId);
        if (!issue) return;

        if (!this.fieldWorkerLocation) {
            this.showError('Location Required', 'Please enable your location first to get directions.');
            this.getFieldWorkerLocation();
            return;
        }

        this.calculateRoute(this.fieldWorkerLocation, issue.location, issue);
    }

    calculateRoute(start, end, issue) {
        try {
            if (this.currentRoute) {
                this.fieldMap.removeControl(this.currentRoute);
            }

            this.currentRoute = L.Routing.control({
                waypoints: [
                    L.latLng(start.latitude, start.longitude),
                    L.latLng(end.latitude, end.longitude)
                ],
                routeWhileDragging: false,
                addWaypoints: false,
                createMarker: function() { return null; },
                router: L.Routing.osrmv1({
                    serviceUrl: 'https://router.project-osrm.org/route/v1'
                })
            }).on('routesfound', (e) => {
                const routes = e.routes;
                const summary = routes[0].summary;

                this.showDirectionModal(issue, summary);
                this.updateNavigationInfo(issue, summary);
            }).on('routingerror', (e) => {
                console.error('Routing error:', e.error);
                this.showError('Route Error', 'Unable to calculate route. Please try again or use external navigation.');
            }).addTo(this.fieldMap);

        } catch (error) {
            console.error('Error calculating route:', error);
            this.showError('Route Error', 'Unable to calculate route. Please try again.');
        }
    }

    showDirectionModal(issue, routeSummary) {
        const modal = document.getElementById('directionModal');
        const summary = document.getElementById('directionSummary');

        if (modal && summary) {
            const distance = (routeSummary.totalDistance / 1000).toFixed(2);
            const time = Math.round(routeSummary.totalTime / 60);

            summary.innerHTML = `
                <div class="route-info">
                    <h4>Route to ${issue.type} (${issue.id})</h4>
                    <p><strong>Address:</strong> ${issue.location.address}</p>
                    <p><strong>Distance:</strong> ${distance} km</p>
                    <p><strong>Estimated Time:</strong> ${time} minutes</p>
                    <p><strong>Priority:</strong> <span class="priority-${issue.priority.toLowerCase()}">${issue.priority}</span></p>
                    <p><strong>Description:</strong> ${issue.description}</p>
                </div>
            `;

            this.currentNavigationIssue = issue;
            modal.classList.remove('hidden');
        }
    }

    updateNavigationInfo(issue, routeSummary) {
        const info = document.getElementById('navigationInfo');
        if (info) {
            const distance = (routeSummary.totalDistance / 1000).toFixed(2);
            const time = Math.round(routeSummary.totalTime / 60);

            info.innerHTML = `
                <p><strong>Active Route:</strong> ${issue.type} (${issue.id})</p>
                <p>Distance: ${distance} km • Time: ${time} min • Priority: ${issue.priority}</p>
            `;
        }
    }

    openInMapsApp() {
        if (!this.currentNavigationIssue) return;

        const issue = this.currentNavigationIssue;
        const lat = issue.location.latitude;
        const lng = issue.location.longitude;

        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
            const fallbackUrl = `https://maps.google.com/?q=${lat},${lng}`;

            try {
                window.open(googleMapsUrl, '_blank');
            } catch {
                window.open(fallbackUrl, '_blank');
            }
        } else {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
            window.open(url, '_blank');
        }

        this.hideModal('directionModal');
    }

    startNavigation() {
        if (!this.currentNavigationIssue) return;

        const issue = this.currentNavigationIssue;

        if (navigator.geolocation) {
            this.navigationWatchId = navigator.geolocation.watchPosition(
                (position) => {
                    this.updateFieldWorkerPosition(position);
                },
                (error) => {
                    console.error('Navigation tracking error:', error);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
            );
        }

        this.hideModal('directionModal');
        this.showSuccess('Navigation Started', `Navigation to ${issue.type} (${issue.id}) has started. Your location will be tracked.`);
    }

    updateFieldWorkerPosition(position) {
        const coords = position.coords;
        this.fieldWorkerLocation = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            timestamp: new Date()
        };

        if (this.fieldWorkerMarker) {
            this.fieldMap.removeLayer(this.fieldWorkerMarker);
        }

        this.fieldWorkerMarker = L.marker([coords.latitude, coords.longitude], {
            icon: L.divIcon({
                html: 'WORKER',
                iconSize: [25, 25],
                className: 'field-worker-marker'
            })
        }).addTo(this.fieldMap);

        this.fieldWorkerMarker.bindPopup('Your Current Location');
    }

    getFieldWorkerLocation() {
        if (!navigator.geolocation) {
            this.showError('GPS Not Available', 'Geolocation is not supported by this browser.');
            return;
        }

        const btn = document.getElementById('getMyLocationBtn');
        if (btn) btn.textContent = 'Getting Location...';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.fieldWorkerLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: new Date()
                };

                if (this.fieldWorkerMarker) {
                    this.fieldMap.removeLayer(this.fieldWorkerMarker);
                }

                this.fieldWorkerMarker = L.marker([position.coords.latitude, position.coords.longitude], {
                    icon: L.divIcon({
                        html: 'WORKER',
                        iconSize: [25, 25], 
                        className: 'field-worker-marker'
                    })
                }).addTo(this.fieldMap);

                this.fieldWorkerMarker.bindPopup('Your Location').openPopup();
                this.fieldMap.setView([position.coords.latitude, position.coords.longitude], 14);

                if (btn) btn.textContent = 'Location Updated';
                setTimeout(() => {
                    if (btn) btn.textContent = 'Get My Location';
                }, 2000);
            },
            (error) => {
                console.error('Field worker location error:', error);
                this.showError('Location Error', 'Unable to get your current location. Please check GPS settings.');
                if (btn) btn.textContent = 'Get My Location';
            },
            this.gpsSettings
        );
    }

    findNearestIssue() {
        if (!this.fieldWorkerLocation) {
            this.showError('Location Required', 'Please get your location first.');
            this.getFieldWorkerLocation();
            return;
        }

        let nearestIssue = null;
        let nearestDistance = Infinity;

        this.issues.forEach(issue => {
            if (issue.status === 'Resolved') return;

            const distance = this.calculateDistance(
                this.fieldWorkerLocation.latitude, this.fieldWorkerLocation.longitude,
                issue.location.latitude, issue.location.longitude
            );

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIssue = issue;
            }
        });

        if (nearestIssue) {
            this.getDirectionsToIssue(nearestIssue.id);

            this.issueMarkers.forEach(marker => {
                if (marker.issueData && marker.issueData.id === nearestIssue.id) {
                    marker.setStyle({ weight: 5, color: '#ff0000' });
                    marker.openPopup();
                }
            });

            this.showSuccess('Nearest Issue Found', `Found nearest issue: ${nearestIssue.type} (${nearestDistance.toFixed(2)} km away)`);
        } else {
            this.showError('No Issues Found', 'No unresolved issues found in your area.');
        }
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = this.degToRad(lat2 - lat1);
        const dLng = this.degToRad(lng2 - lng1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    degToRad(deg) {
        return deg * (Math.PI/180);
    }

    optimizeRoute() {
        if (!this.fieldWorkerLocation) {
            this.showError('Location Required', 'Please get your location first.');
            return;
        }

        const unresolvedIssues = this.issues.filter(issue => 
            issue.status !== 'Resolved' && issue.priority !== 'Low'
        );

        if (unresolvedIssues.length === 0) {
            this.showError('No Issues', 'No high-priority unresolved issues found.');
            return;
        }

        const optimizedRoute = this.calculateOptimizedRoute(unresolvedIssues);

        if (optimizedRoute.length > 0) {
            this.showOptimizedRoute(optimizedRoute);
        }
    }

    calculateOptimizedRoute(issues) {
        if (!this.fieldWorkerLocation || issues.length === 0) return [];

        const unvisited = [...issues];
        const route = [];
        let currentLocation = this.fieldWorkerLocation;

        while (unvisited.length > 0) {
            let nearestIssue = null;
            let nearestDistance = Infinity;
            let nearestIndex = -1;

            unvisited.forEach((issue, index) => {
                const distance = this.calculateDistance(
                    currentLocation.latitude, currentLocation.longitude,
                    issue.location.latitude, issue.location.longitude
                );

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIssue = issue;
                    nearestIndex = index;
                }
            });

            if (nearestIssue) {
                route.push(nearestIssue);
                currentLocation = nearestIssue.location;
                unvisited.splice(nearestIndex, 1);
            }
        }

        return route;
    }

    showOptimizedRoute(route) {
        this.clearRoute();

        const waypoints = [
            L.latLng(this.fieldWorkerLocation.latitude, this.fieldWorkerLocation.longitude)
        ];

        route.forEach(issue => {
            waypoints.push(L.latLng(issue.location.latitude, issue.location.longitude));
        });

        this.currentRoute = L.Routing.control({
            waypoints: waypoints,
            routeWhileDragging: false,
            addWaypoints: false,
            createMarker: function() { return null; }
        }).on('routesfound', (e) => {
            const summary = e.routes[0].summary;
            const distance = (summary.totalDistance / 1000).toFixed(2);
            const time = Math.round(summary.totalTime / 60);

            this.showSuccess('Route Optimized', 
                `Optimized route created for ${route.length} issues. Total distance: ${distance} km. Estimated time: ${time} minutes`
            );
        }).addTo(this.fieldMap);
    }

    clearRoute() {
        if (this.currentRoute) {
            this.fieldMap.removeControl(this.currentRoute);
            this.currentRoute = null;
        }

        const info = document.getElementById('navigationInfo');
        if (info) {
            info.innerHTML = '<p>Click on any issue marker to get directions</p>';
        }

        if (this.navigationWatchId) {
            navigator.geolocation.clearWatch(this.navigationWatchId);
            this.navigationWatchId = null;
        }
    }

    showAllIssuesOnMap() {
        if (this.fieldMap && this.issues.length > 0) {
            const group = new L.featureGroup(this.issueMarkers);
            this.fieldMap.fitBounds(group.getBounds().pad(0.1));
        }
    }

    filterMapIssues() {
        const priorityFilter = document.getElementById('priorityMapFilter')?.value;

        this.issueMarkers.forEach(marker => {
            this.fieldMap.removeLayer(marker);
        });
        this.issueMarkers = [];

        let filteredIssues = this.issues.filter(issue => issue.status !== 'Resolved');

        if (priorityFilter) {
            filteredIssues = filteredIssues.filter(issue => issue.priority === priorityFilter);
        }

        filteredIssues.forEach(issue => {
            const color = this.getMarkerColor(issue.priority);
            const marker = L.circleMarker([issue.location.latitude, issue.location.longitude], {
                color: color,
                fillColor: color,
                fillOpacity: 0.8,
                radius: 10,
                weight: 3
            }).addTo(this.fieldMap);

            marker.issueData = issue;

            marker.bindPopup(`
                <div class="field-marker-popup">
                    <h4>${issue.type} - ${issue.id}</h4>
                    <p><strong>Priority:</strong> <span class="priority-${issue.priority.toLowerCase()}">${issue.priority}</span></p>
                    <p><strong>Status:</strong> ${issue.status}</p>
                    <p><strong>Address:</strong> ${issue.location.address}</p>
                    <p><strong>Description:</strong> ${issue.description}</p>
                    <div class="popup-actions">
                        <button onclick="app.getDirectionsToIssue('${issue.id}')" class="btn btn--primary btn--sm">Get Directions</button>
                        <button onclick="app.showIssueDetails('${issue.id}')" class="btn btn--secondary btn--sm">View Photo</button>
                    </div>
                </div>
            `);

            this.issueMarkers.push(marker);
        });
    }

    refreshCommunityMap() {
        if (this.communityMap) {
            this.communityMap.eachLayer((layer) => {
                if (layer instanceof L.CircleMarker) {
                    this.communityMap.removeLayer(layer);
                }
            });
            this.addIssueMarkersToCommunityMap();
        }
    }

    centerMapOnUser() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (this.communityMap) {
                        this.communityMap.setView([position.coords.latitude, position.coords.longitude], 14);

                        L.marker([position.coords.latitude, position.coords.longitude])
                            .addTo(this.communityMap)
                            .bindPopup('Your Location')
                            .openPopup();
                    }
                },
                (error) => {
                    this.showError('Location Error', 'Unable to get your current location.');
                }
            );
        }
    }

    // ===== CORE APPLICATION FUNCTIONALITY =====

    checkGeolocationSupport() {
        if (!navigator.geolocation) {
            this.updateGPSStatus('Geolocation not supported', 'error');
            this.showError('Geolocation Not Supported', 'Your browser does not support location services.');
            return false;
        } else {
            this.updateGPSStatus('Ready for location detection', 'info');
            this.updateLocationIndicator('Click to detect location');
            return true;
        }
    }

    detectLocation() {
        if (this.isDetectingLocation) return;
        if (!this.checkGeolocationSupport()) return;

        this.isDetectingLocation = true;
        this.updateGPSStatus('Detecting location...', 'info');
        this.updateLocationIndicator('Detecting your location...');

        const detectBtn = document.getElementById('detectLocationBtn');
        const refreshBtn = document.getElementById('refreshLocationBtn');

        if (detectBtn) detectBtn.disabled = true;
        if (refreshBtn) refreshBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => this.onLocationSuccess(position),
            (error) => this.onLocationError(error),
            this.gpsSettings
        );
    }

    onLocationSuccess(position) {
        this.isDetectingLocation = false;
        this.locationDetected = true;
        this.detectionTimestamp = new Date();
        const coords = position.coords;

        this.currentLocation = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            timestamp: this.detectionTimestamp,
            method: coords.accuracy < 50 ? 'GPS Satellite' : 'Network/WiFi'
        };

        this.detectedFullAddress = this.generateDetailedAddress(coords.latitude, coords.longitude);

        this.updateGPSStatus('Location detected successfully', 'success');
        this.updateGPSAccuracy(coords.accuracy);
        this.displayCoordinates(coords);
        this.displayFullAddress(this.detectedFullAddress);
        this.updateLocationIndicator(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
        this.updateLocationSummary();
        this.checkFormValidity();

        this.initializeReportMap();

        const detectBtn = document.getElementById('detectLocationBtn');
        const refreshBtn = document.getElementById('refreshLocationBtn');

        if (detectBtn) detectBtn.disabled = false;
        if (refreshBtn) refreshBtn.disabled = false;
    }

    onLocationError(error) {
        this.isDetectingLocation = false;
        let errorMessage = "";
        let userMessage = "";

        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = "Location access denied by user";
                userMessage = "Please allow location access to detect your position automatically.";
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = "Location information unavailable";
                userMessage = "Your location could not be determined. Please check your device settings.";
                break;
            case error.TIMEOUT:
                errorMessage = "Location request timed out";
                userMessage = "Location detection is taking too long. Please try again.";
                break;
            default:
                errorMessage = "Unknown location error";
                userMessage = "An unexpected error occurred while detecting your location.";
                break;
        }

        this.updateGPSStatus(errorMessage, 'error');
        this.updateLocationIndicator('Location detection failed');
        this.showError('Location Detection Error', userMessage);

        const detectBtn = document.getElementById('detectLocationBtn');
        const refreshBtn = document.getElementById('refreshLocationBtn');

        if (detectBtn) detectBtn.disabled = false;
        if (refreshBtn) refreshBtn.disabled = false;
    }

    refreshLocation() {
        this.detectLocation();
    }

    useManualLocation() {
        const latInput = document.getElementById('manualLat');
        const lngInput = document.getElementById('manualLng');

        if (!latInput || !lngInput) return;

        const lat = parseFloat(latInput.value);
        const lng = parseFloat(lngInput.value);

        if (this.validateCoordinateValues(lat, lng)) {
            this.locationDetected = true;
            this.detectionTimestamp = new Date();
            this.currentLocation = {
                latitude: lat,
                longitude: lng,
                accuracy: null,
                timestamp: this.detectionTimestamp,
                method: 'Manual Input'
            };

            this.detectedFullAddress = this.generateDetailedAddress(lat, lng);

            this.updateGPSStatus('Manual location set', 'success');
            this.updateLocationIndicator(`${lat.toFixed(4)}, ${lng.toFixed(4)} (Manual)`);
            this.displayCoordinates({ latitude: lat, longitude: lng });
            this.displayFullAddress(this.detectedFullAddress);
            this.updateLocationSummary();
            this.checkFormValidity();

            this.initializeReportMap();

            latInput.value = '';
            lngInput.value = '';
        } else {
            this.showError('Invalid Coordinates', 'Please enter valid coordinates (latitude: -90 to 90, longitude: -180 to 180).');
        }
    }

    validateManualCoordinates() {
        const latInput = document.getElementById('manualLat');
        const lngInput = document.getElementById('manualLng');

        if (!latInput || !lngInput) return false;

        const lat = parseFloat(latInput.value);
        const lng = parseFloat(lngInput.value);

        if (isNaN(lat) || isNaN(lng)) return false;

        return this.validateCoordinateValues(lat, lng);
    }

    validateCoordinateValues(lat, lng) {
        return lat >= this.coordinateBounds.latitude.min &&
               lat <= this.coordinateBounds.latitude.max &&
               lng >= this.coordinateBounds.longitude.min &&
               lng <= this.coordinateBounds.longitude.max;
    }

    displayFullAddress(address) {
        const addressElement = document.getElementById('detectedFullAddress');
        if (addressElement) {
            addressElement.innerHTML = `<div class="address-line">${address}</div>`;
        }
    }

    displayCoordinates(coords) {
        const coordsDisplay = document.getElementById('coordinatesDisplay');
        const latElement = document.getElementById('currentLat');
        const lngElement = document.getElementById('currentLng');
        const timeElement = document.getElementById('detectionTime');
        const accuracyElement = document.getElementById('locationAccuracy');
        const methodElement = document.getElementById('detectionMethod');

        if (coordsDisplay) coordsDisplay.classList.remove('hidden');
        if (latElement) latElement.textContent = coords.latitude.toFixed(8);
        if (lngElement) lngElement.textContent = coords.longitude.toFixed(8);
        if (timeElement) timeElement.textContent = this.detectionTimestamp ? this.detectionTimestamp.toLocaleString() : 'Not available';
        if (accuracyElement && this.currentLocation.accuracy) {
            accuracyElement.textContent = `±${Math.round(this.currentLocation.accuracy)}m`;
        }
        if (methodElement) methodElement.textContent = this.currentLocation.method || 'Unknown';
    }

    updateLocationSummary() {
        const locationSummary = document.getElementById('locationSummary');
        const summaryFullAddress = document.getElementById('summaryFullAddress');
        const summaryCoordinates = document.getElementById('summaryCoordinates');
        const summaryTime = document.getElementById('summaryTime');
        const summaryMethod = document.getElementById('summaryMethod');
        const summaryAccuracy = document.getElementById('summaryAccuracy');

        if (!this.currentLocation) return;

        if (locationSummary) locationSummary.style.display = 'block';
        if (summaryFullAddress) summaryFullAddress.textContent = this.detectedFullAddress || 'Address not available';
        if (summaryCoordinates) summaryCoordinates.textContent = `${this.currentLocation.latitude.toFixed(6)}, ${this.currentLocation.longitude.toFixed(6)}`;
        if (summaryTime) summaryTime.textContent = this.detectionTimestamp ? this.detectionTimestamp.toLocaleString() : 'Not available';
        if (summaryMethod) summaryMethod.textContent = this.currentLocation.method;
        if (summaryAccuracy) summaryAccuracy.textContent = this.currentLocation.accuracy ? `±${Math.round(this.currentLocation.accuracy)}m` : 'Manual input';
    }

    updateGPSStatus(status, type = 'info') {
        const statusElement = document.getElementById('gpsStatus');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `status status--${type}`;
        }
    }

    updateGPSAccuracy(accuracy) {
        const accuracyElement = document.getElementById('gpsAccuracy');
        if (accuracyElement && typeof accuracy === 'number') {
            let description = 'Very approximate';
            if (accuracy <= 10) description = 'Very accurate (GPS)';
            else if (accuracy <= 100) description = 'Good accuracy (Network)';
            else if (accuracy <= 1000) description = 'Approximate (Cell tower)';

            accuracyElement.textContent = `±${Math.round(accuracy)}m (${description})`;
        }
    }

    updateLocationIndicator(text) {
        const indicator = document.getElementById('currentLocationText');
        if (indicator) {
            indicator.textContent = text;
        }
    }

    previewPhoto(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('photoPreview');
        const photoError = document.getElementById('photoError');

        if (file) {
            this.photoUploaded = true;
            const reader = new FileReader();
            reader.onload = (e) => {
                this.currentPhotoData = e.target.result;
                preview.innerHTML = `<img src="${e.target.result}" alt="Photo preview">
                    <p class="photo-info">Photo uploaded: ${file.name} (${Math.round(file.size / 1024)}KB)</p>`;
                preview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);

            if (photoError) photoError.classList.add('hidden');
        } else {
            this.photoUploaded = false;
            this.currentPhotoData = null;
            preview.classList.add('hidden');
            if (photoError) photoError.classList.remove('hidden');
        }

        this.checkFormValidity();
    }

    checkFormValidity() {
        const submitBtn = document.getElementById('submitIssue');
        if (submitBtn) {
            submitBtn.disabled = !(this.locationDetected && this.photoUploaded);
        }
    }

    showImageModal(imageSrc, imageInfo, issueId) {
        const modal = document.getElementById('imageModal');
        const modalImage = document.getElementById('modalImage');
        const modalTitle = document.getElementById('imageModalTitle');
        const imageInfoElement = document.getElementById('imageInfo');

        if (modal && modalImage) {
            modalImage.src = imageSrc;
            modalTitle.textContent = `Issue Photo - ${issueId}`;
            imageInfoElement.textContent = imageInfo;
            modal.classList.remove('hidden');
        }
    }

    showIssueDetails(issueId) {
        const issue = this.issues.find(i => i.id === issueId);
        if (issue && issue.photoData) {
            this.showImageModal(issue.photoData, `File: ${issue.photoName} (${Math.round(issue.photoSize / 1024)}KB)`, issueId);
        }
    }

    toggleView() {
        this.currentView = this.currentView === 'citizen' ? 'admin' : 'citizen';

        const citizenInterface = document.getElementById('citizenInterface');
        const adminInterface = document.getElementById('adminInterface');
        const toggleBtn = document.getElementById('viewToggle');

        if (this.currentView === 'admin') {
            citizenInterface?.classList.add('hidden');
            adminInterface?.classList.remove('hidden');
            if (toggleBtn) toggleBtn.textContent = 'Switch to Citizen';
            this.showAdminTab('dashboard');
        } else {
            citizenInterface?.classList.remove('hidden');
            adminInterface?.classList.add('hidden');
            if (toggleBtn) toggleBtn.textContent = 'Switch to Admin';
            this.showSection('landing');
        }
    }

    showSection(sectionName) {
        const sections = ['landing', 'reportIssue', 'trackIssues', 'communityMap'];
        sections.forEach(section => {
            const element = document.getElementById(section);
            if (element) {
                element.classList.add('hidden');
            }
        });

        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }

        this.currentSection = sectionName;

        if (sectionName === 'trackIssues') {
            this.renderUserIssues();
        } else if (sectionName === 'communityMap') {
            setTimeout(() => this.initializeCommunityMap(), 100);
        }
    }

    showAdminTab(tabName) {
        const tabs = ['dashboard', 'issues', 'fieldMap', 'analytics'];
        tabs.forEach(tab => {
            const btn = document.getElementById(tab + 'Tab');
            const content = document.getElementById(tab + 'Content');

            if (btn && content) {
                if (tab === tabName) {
                    btn.classList.add('active');
                    content.classList.remove('hidden');
                } else {
                    btn.classList.remove('active');
                    content.classList.add('hidden');
                }
            }
        });

        this.currentAdminTab = tabName;

        if (tabName === 'dashboard') {
            this.renderAdminDashboard();
        } else if (tabName === 'issues') {
            this.renderAdminIssues();
        } else if (tabName === 'fieldMap') {
            setTimeout(() => this.initializeFieldMap(), 100);
        } else if (tabName === 'analytics') {
            this.renderAnalytics();
        }
    }

    submitIssue(event) {
        event.preventDefault();

        if (!this.currentLocation) {
            this.showError('Location Required', 'Please detect or set your location before submitting an issue.');
            return;
        }

        if (!this.photoUploaded || !this.currentPhotoData) {
            this.showError('Photo Required', 'Please upload a photo of the issue before submitting your report.');
            return;
        }

        const form = event.target;

        const issue = {
            id: 'ISS' + Date.now(),
            type: document.getElementById('issueType').value,
            description: document.getElementById('issueDescription').value,
            priority: document.getElementById('issuePriority').value,
            location: {
                latitude: this.currentLocation.latitude,
                longitude: this.currentLocation.longitude,
                accuracy: this.currentLocation.accuracy,
                method: this.currentLocation.method,
                address: this.detectedFullAddress,
                detectionTime: this.detectionTimestamp.toISOString(),
                detectionTimeFormatted: this.detectionTimestamp.toLocaleString()
            },
            photoUploaded: this.photoUploaded,
            photoName: document.getElementById('issuePhoto').files[0]?.name || 'Unknown',
            photoSize: document.getElementById('issuePhoto').files[0]?.size || 0,
            photoData: this.currentPhotoData,
            timestamp: new Date().toISOString(),
            status: 'Submitted',
            department: this.assignDepartment(document.getElementById('issueType').value),
            reportedBy: 'citizen'
        };

        this.issues.push(issue);
        this.userIssues.push(issue);

        this.saveIssues();
        this.saveUserIssues();

        this.updateStats();
        this.renderUserIssues();

        form.reset();
        this.resetForm();

        this.showSuccess('Issue Reported Successfully!', 
            `Your issue has been submitted with ID: ${issue.id}. Location: ${issue.location.address}. Coordinates: ${issue.location.latitude.toFixed(6)}, ${issue.location.longitude.toFixed(6)}. Detected at: ${issue.location.detectionTimeFormatted}. Photo: ${issue.photoName}. Department: ${issue.department}`
        );
    }

    resetForm() {
        this.photoUploaded = false;
        this.locationDetected = false;
        this.currentLocation = null;
        this.detectionTimestamp = null;
        this.detectedFullAddress = null;
        this.currentPhotoData = null;

        if (this.reportMap) {
            this.reportMap.remove();
            this.reportMap = null;
        }

        document.getElementById('submitIssue').disabled = true;
        document.getElementById('coordinatesDisplay')?.classList.add('hidden');
        document.getElementById('photoPreview')?.classList.add('hidden');
        document.getElementById('locationSummary').style.display = 'none';

        this.updateLocationIndicator('Location cleared - detect again for next report');
        this.updateGPSStatus('Ready for location detection', 'info');
    }

    assignDepartment(issueType) {
        const departmentMap = {
            'Potholes': 'Public Works',
            'Street Lights': 'Public Works', 
            'Garbage/Waste': 'Sanitation Department',
            'Water Issues': 'Water Authority',
            'Traffic Signals': 'Traffic Management',
            'Parks & Recreation': 'Parks Department',
            'Road Damage': 'Public Works',
            'Public Safety': 'Public Safety',
            'Other': 'General Services'
        };

        return departmentMap[issueType] || 'General Services';
    }

    // ===== DATA MANAGEMENT =====

    saveIssues() {
        try {
            localStorage.setItem('civicconnect-issues', JSON.stringify(this.issues));
        } catch (error) {
            console.error('Error saving issues:', error);
        }
    }

    loadIssues() {
        try {
            const saved = localStorage.getItem('civicconnect-issues');
            return saved ? JSON.parse(saved) : this.getSampleIssues();
        } catch (error) {
            console.error('Error loading issues:', error);
            return this.getSampleIssues();
        }
    }

    saveUserIssues() {
        try {
            localStorage.setItem('civicconnect-user-issues', JSON.stringify(this.userIssues));
        } catch (error) {
            console.error('Error saving user issues:', error);
        }
    }

    loadUserIssues() {
        try {
            const saved = localStorage.getItem('civicconnect-user-issues');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading user issues:', error);
            return [];
        }
    }

    getSampleIssues() {
        return [
            {
                id: 'ISS001',
                type: 'Potholes',
                description: 'Large pothole on Main Street causing traffic issues and vehicle damage',
                priority: 'High',
                location: {
                    latitude: 13.0827,
                    longitude: 80.2707,
                    accuracy: 15,
                    method: 'GPS Satellite',
                    address: 'Sriperumbudur, Kanchipuram, Tamil Nadu, 603202, India',
                    detectionTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    detectionTimeFormatted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleString()
                },
                photoUploaded: true,
                photoName: 'pothole_main_street.jpg',
                photoSize: 245760,
                photoData: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPklzc3VlIFBob3RvPC90ZXh0Pjwvc3ZnPg==',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'In Progress',
                department: 'Public Works',
                reportedBy: 'citizen'
            },
            {
                id: 'ISS002',
                type: 'Street Lights',
                description: 'Street light not working on Oak Avenue - safety concern for pedestrians',
                priority: 'Medium',
                location: {
                    latitude: 13.0569,
                    longitude: 80.2471,
                    accuracy: 23,
                    method: 'Network/WiFi',
                    address: 'T. Nagar, Chennai, Tamil Nadu, 600017, India',
                    detectionTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    detectionTimeFormatted: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleString()
                },
                photoUploaded: true,
                photoName: 'broken_streetlight.jpg',
                photoSize: 198400,
                photoData: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxpZ2h0IElzc3VlPC90ZXh0Pjwvc3ZnPg==',
                timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'Acknowledged',
                department: 'Public Works',
                reportedBy: 'citizen'
            },
            {
                id: 'ISS003',
                type: 'Garbage/Waste',
                description: 'Overflowing garbage bin needs immediate attention - health hazard',
                priority: 'Emergency',
                location: {
                    latitude: 13.0445,
                    longitude: 80.2590,
                    accuracy: 8,
                    method: 'GPS Satellite',
                    address: 'Velachery, Chennai, Tamil Nadu, 600042, India',
                    detectionTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                    detectionTimeFormatted: new Date(Date.now() - 3 * 60 * 60 * 1000).toLocaleString()
                },
                photoUploaded: true,
                photoName: 'garbage_overflow.jpg',
                photoSize: 178432,
                photoData: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdhcmJhZ2UgSXNzdWU8L3RleHQ+PC9zdmc+',
                timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                status: 'Submitted',
                department: 'Sanitation Department',
                reportedBy: 'citizen'
            }
        ];
    }

    updateStats() {
        const total = this.issues.length;
        const resolved = this.issues.filter(issue => issue.status === 'Resolved').length;
        const pending = this.issues.filter(issue => issue.status === 'Submitted').length;
        const inProgress = this.issues.filter(issue => issue.status === 'In Progress').length;

        document.getElementById('totalIssues').textContent = total;
        document.getElementById('resolvedIssues').textContent = resolved;

        document.getElementById('adminTotalIssues').textContent = total;
        document.getElementById('adminPendingIssues').textContent = pending;
        document.getElementById('adminInProgressIssues').textContent = inProgress;
        document.getElementById('adminResolvedIssues').textContent = resolved;
    }

    // ===== UI RENDERING =====

    renderUserIssues() {
        const container = document.getElementById('userIssuesList');
        if (!container) return;

        if (this.userIssues.length === 0) {
            container.innerHTML = '<p class="no-issues">No issues reported yet. Submit your first report!</p>';
            return;
        }

        const issuesHtml = this.userIssues.map(issue => `
            <div class="issue-item">
                <div class="issue-header">
                    <span class="issue-type">${issue.type}</span>
                    <span class="issue-priority ${issue.priority.toLowerCase()}">${issue.priority}</span>
                </div>
                <p class="issue-description">${issue.description}</p>
                <div class="issue-address">
                    Location: ${issue.location.address}
                </div>
                <div class="issue-location">
                    Coordinates: ${issue.location.latitude.toFixed(6)}, ${issue.location.longitude.toFixed(6)}
                    ${issue.location.accuracy ? `(±${Math.round(issue.location.accuracy)}m)` : ''}
                    via ${issue.location.method}
                </div>
                <div class="issue-photo-section">
                    ${issue.photoData ? 
                        `<div class="photo-thumbnail" onclick="app.showImageModal('${issue.photoData}', 'File: ${issue.photoName} (${Math.round(issue.photoSize / 1024)}KB)', '${issue.id}')">
                            <img src="${issue.photoData}" alt="Issue photo thumbnail" class="photo-thumb">
                            <div class="photo-overlay">
                                <span>Click to view full image</span>
                            </div>
                        </div>` :
                        `<div class="no-photo">Photo: ${issue.photoName} (${Math.round(issue.photoSize / 1024)}KB)</div>`
                    }
                </div>
                <div class="issue-metadata">
                    Location detected: ${issue.location.detectionTimeFormatted}
                </div>
                <div class="issue-status status-${issue.status.toLowerCase().replace(' ', '-')}">${issue.status}</div>
                <div class="issue-time">Submitted: ${new Date(issue.timestamp).toLocaleString()}</div>
            </div>
        `).join('');

        container.innerHTML = issuesHtml;
    }

    renderAdminDashboard() {
        this.updateStats();
        this.renderIssueTypesChart();
        this.renderStatusChart();
    }

    renderAdminIssues() {
        this.filterAdminIssues();
    }

    filterAdminIssues() {
        const container = document.getElementById('adminIssuesList');
        if (!container) return;

        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const priorityFilter = document.getElementById('priorityFilter')?.value || '';

        let filteredIssues = this.issues;

        if (statusFilter) {
            filteredIssues = filteredIssues.filter(issue => issue.status === statusFilter);
        }

        if (priorityFilter) {
            filteredIssues = filteredIssues.filter(issue => issue.priority === priorityFilter);
        }

        if (filteredIssues.length === 0) {
            container.innerHTML = '<p class="no-issues">No issues match the current filters</p>';
            return;
        }

        const issuesHtml = filteredIssues.map(issue => `
            <div class="admin-issue-item">
                <div class="admin-issue-header">
                    <div>
                        <span class="issue-type">${issue.type}</span>
                        <span class="issue-priority ${issue.priority.toLowerCase()}">${issue.priority}</span>
                    </div>
                    <div>
                        <span class="issue-status status-${issue.status.toLowerCase().replace(' ', '-')}">${issue.status}</span>
                    </div>
                </div>
                <p class="issue-description">${issue.description}</p>
                <div class="issue-address">
                    Location: ${issue.location.address}
                </div>
                <div class="issue-location">
                    Coordinates: ${issue.location.latitude.toFixed(6)}, ${issue.location.longitude.toFixed(6)}
                    (${issue.location.method}) - ${issue.department}
                </div>
                <div class="admin-photo-section">
                    ${issue.photoData ? 
                        `<div class="admin-photo-view">
                            <div class="photo-thumbnail" onclick="app.showImageModal('${issue.photoData}', 'File: ${issue.photoName} (${Math.round(issue.photoSize / 1024)}KB) - Submitted by citizen', '${issue.id}')">
                                <img src="${issue.photoData}" alt="Issue photo thumbnail" class="admin-photo-thumb">
                                <div class="photo-overlay">
                                    <span>View Photo</span>
                                </div>
                            </div>
                            <div class="photo-info">
                                <strong>Photo:</strong> ${issue.photoName} (${Math.round(issue.photoSize / 1024)}KB)
                            </div>
                        </div>` :
                        `<div class="no-photo">Photo: ${issue.photoName} (${Math.round(issue.photoSize / 1024)}KB) - Data not available</div>`
                    }
                </div>
                <div class="issue-metadata">
                    Location detected: ${issue.location.detectionTimeFormatted}
                </div>
                <div class="issue-actions">
                    <select onchange="app.updateIssueStatus('${issue.id}', this.value)">
                        <option value="${issue.status}">${issue.status}</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Acknowledged">Acknowledged</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                    </select>
                    <button onclick="app.viewIssueOnMap('${issue.id}')" class="btn btn--outline btn--sm">View on Map</button>
                </div>
                <div class="issue-time">Submitted: ${new Date(issue.timestamp).toLocaleString()}</div>
            </div>
        `).join('');

        container.innerHTML = issuesHtml;
    }

    viewIssueOnMap(issueId) {
        this.showAdminTab('fieldMap');

        const issue = this.issues.find(i => i.id === issueId);
        if (issue && this.fieldMap) {
            setTimeout(() => {
                this.fieldMap.setView([issue.location.latitude, issue.location.longitude], 16);

                this.issueMarkers.forEach(marker => {
                    if (marker.issueData && marker.issueData.id === issueId) {
                        marker.openPopup();
                        marker.setStyle({ weight: 5, color: '#ff0000' });

                        setTimeout(() => {
                            marker.setStyle({ weight: 3, color: this.getMarkerColor(issue.priority) });
                        }, 3000);
                    }
                });
            }, 200);
        }
    }

    updateIssueStatus(issueId, newStatus) {
        const issue = this.issues.find(i => i.id === issueId);
        if (issue) {
            issue.status = newStatus;

            const userIssue = this.userIssues.find(i => i.id === issueId);
            if (userIssue) {
                userIssue.status = newStatus;
                this.saveUserIssues();
            }

            this.saveIssues();
            this.updateStats();
            this.renderAdminIssues();

            if (this.fieldMap) {
                this.addIssueMarkersToFieldMap();
            }
        }
    }

    renderAnalytics() {
        this.renderTrendsChart();
        this.renderDepartmentChart();
    }

    renderIssueTypesChart() {
        const canvas = document.getElementById('issueTypesChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.charts.issueTypes) {
            this.charts.issueTypes.destroy();
        }

        const issueTypes = {};
        this.issues.forEach(issue => {
            issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
        });

        this.charts.issueTypes = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(issueTypes),
                datasets: [{
                    data: Object.values(issueTypes),
                    backgroundColor: [
                        '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
                        '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderStatusChart() {
        const canvas = document.getElementById('statusChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.charts.status) {
            this.charts.status.destroy();
        }

        const statuses = {};
        this.issues.forEach(issue => {
            statuses[issue.status] = (statuses[issue.status] || 0) + 1;
        });

        this.charts.status = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(statuses),
                datasets: [{
                    label: 'Number of Issues',
                    data: Object.values(statuses),
                    backgroundColor: ['#3b82f6', '#f59e0b', '#ff6b35', '#10b981']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    renderTrendsChart() {
        const canvas = document.getElementById('trendsChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.charts.trends) {
            this.charts.trends.destroy();
        }

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const data = [12, 19, 15, 25, 22, 18];

        this.charts.trends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Issues Reported',
                    data: data,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    renderDepartmentChart() {
        const canvas = document.getElementById('departmentChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.charts.department) {
            this.charts.department.destroy();
        }

        const departments = {};
        this.issues.forEach(issue => {
            departments[issue.department] = (departments[issue.department] || 0) + 1;
        });

        this.charts.department = new Chart(ctx, {
            type: 'horizontalBar',
            data: {
                labels: Object.keys(departments),
                datasets: [{
                    label: 'Issues Assigned',
                    data: Object.values(departments),
                    backgroundColor: '#10b981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // ===== MODAL FUNCTIONS =====

    showSuccess(title, message) {
        const modal = document.getElementById('successModal');
        const messageElement = document.getElementById('successMessage');
        const detailsElement = document.getElementById('issueDetails');

        if (modal && messageElement) {
            messageElement.textContent = title;
            if (detailsElement) {
                detailsElement.textContent = message;
            }
            modal.classList.remove('hidden');
        }
    }

    showError(title, message) {
        const modal = document.getElementById('errorModal');
        const messageElement = document.getElementById('errorMessage');

        if (modal && messageElement) {
            messageElement.textContent = `${title}: ${message}`;
            modal.classList.remove('hidden');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }
}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new CivicConnectApp();
    console.log('CivicConnect App with Maps & Navigation initialized successfully');
});