document.addEventListener('DOMContentLoaded', () => {
    const prayerNameElem = document.querySelector('.prayer-name');
    const prayerTimeElem = document.querySelector('.prayer-time');
    const gregorianDateElem = document.querySelector('.gregorian-date');
    const islamicDateElem = document.querySelector('.islamic-date');
    const currentTimeElem = document.querySelector('.current-time');
    const countdownElem = document.querySelector('.countdown');
    const prayerTimeBoxes = {
        Fajr: document.getElementById('fajr-time'),
        Sunrise: document.getElementById('sunrise-time'), // Added Sunrise
        Dhuhr: document.getElementById('dhuhr-time'),
        Asr: document.getElementById('asr-time'),
        Maghrib: document.getElementById('maghrib-time'),
        Isha: document.getElementById('isha-time')
    };

    let userLocation = {
        latitude: 38.9717,
        longitude: -95.2353
    };
    let prayerTimes = {};
    let nextPrayerTime;
    let currentDay = new Date().getDate(); // Initialize with the current day

    function getLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(setPosition, showError, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            });
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    }

    function setPosition(position) {
        userLocation.latitude = position.coords.latitude;
        userLocation.longitude = position.coords.longitude;
        fetchPrayerTimes(); // Fetch prayer times after getting the location
    }

    function showError(error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                alert("User denied the request for Geolocation. Please enable location services in your browser settings.");
                break;
            case error.POSITION_UNAVAILABLE:
                alert("Location information is unavailable. Please ensure your device has location services enabled.");
                break;
            case error.TIMEOUT:
                alert("The request to get user location timed out. Please try again.");
                break;
            case error.UNKNOWN_ERROR:
                alert("An unknown error occurred while fetching location. Please try again.");
                break;
        }
        fetchPrayerTimes(); // Fetch prayer times with default location if there's an error
    }

    async function fetchPrayerTimes() {
        const apiUrl = `https://api.aladhan.com/v1/timings?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&method=2&school=1`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (response.ok) {
            const allTimings = data.data.timings;
            prayerTimes = {
                Fajr: allTimings.Fajr,
                Sunrise: allTimings.Sunrise, // Added Sunrise
                Dhuhr: allTimings.Dhuhr,
                Asr: allTimings.Asr,
                Maghrib: allTimings.Maghrib,
                Isha: allTimings.Isha
            };

            if (islamicDateElem) {
                islamicDateElem.textContent = `${data.data.date.readable} (${data.data.date.hijri.day} ${data.data.date.hijri.month.en} ${data.data.date.hijri.year})`;
            }

            for (const prayer in prayerTimes) {
                if (prayerTimeBoxes[prayer]) {
                    prayerTimeBoxes[prayer].textContent = `${prayer}: ${convertTo12HourFormat(prayerTimes[prayer])}`;
                }
            }

            updateNextPrayerTime();
            setInterval(updateClockAndCountdown, 1000); // Update clock and countdown every second
        } else {
            console.error('Error fetching prayer times:', data.status);
        }
    }

    function convertTo12HourFormat(time24) {
        const [hours, minutes] = time24.split(':');
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = (hours % 12) || 12;
        return `${hours12}:${minutes} ${period}`;
    }

    function updateClock() {
        const now = new Date();
        const currentTimeString = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
        if (currentTimeElem) {
            currentTimeElem.textContent = `Time: ${currentTimeString}`;
        }

        if (gregorianDateElem) {
            gregorianDateElem.textContent = now.toDateString();
        }
    }

    function updateCountdown() {
        const now = new Date();
        if (nextPrayerTime) {
            const timeDiff = nextPrayerTime - now;
            if (timeDiff > 0) {
                const hours = Math.floor(timeDiff / (1000 * 60 * 60));
                const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
                if (countdownElem) {
                    countdownElem.textContent = `Next Prayer in: ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
                }
            } else {
                if (countdownElem) {
                    countdownElem.textContent = 'Next Prayer in: 0 hours, 0 minutes, 0 seconds';
                }
                // Update next prayer time if the countdown reaches zero
                updateNextPrayerTime();
            }
        }
    }

    function updateNextPrayerTime() {
        const now = new Date();
        let nextPrayer = null;
        for (const prayer in prayerTimes) {
            if (prayer === 'Sunrise') continue; // Skip Sunrise as a prayer
            const [hours, minutes] = prayerTimes[prayer].split(':');
            const prayerTimeDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
            if (prayerTimeDate > now) {
                nextPrayer = prayer;
                nextPrayerTime = prayerTimeDate;
                break;
            }
        }

        if (!nextPrayer) {
            const [fajrHour, fajrMinute] = prayerTimes.Fajr.split(':');
            const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            nextDay.setHours(fajrHour);
            nextDay.setMinutes(fajrMinute);
            if (prayerNameElem) {
                prayerNameElem.textContent = 'Fajr';
            }
            if (prayerTimeElem) {
                prayerTimeElem.textContent = convertTo12HourFormat(prayerTimes.Fajr);
            }
            nextPrayerTime = nextDay;
        } else {
            if (prayerNameElem) {
                prayerNameElem.textContent = nextPrayer;
            }
            if (prayerTimeElem) {
                prayerTimeElem.textContent = convertTo12HourFormat(prayerTimes[nextPrayer]);
            }
        }
    }

    function updateClockAndCountdown() {
        updateClock();
        updateCountdown();
        // Check if the date has changed and fetch new prayer times if needed
        const now = new Date();
        if (now.getDate() !== currentDay) {
            currentDay = now.getDate();
            fetchPrayerTimes();
        }
    }

    getLocation(); // Get user's location and fetch prayer times
});
