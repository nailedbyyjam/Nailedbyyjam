
 // ======================================================
 // SUPABASE CONNECTION
 // ======================================================

const SUPABASE_URL =
"https://jqnlyxqzowamvncxugph.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
"sb_publishable_lS3qut0gbN-JSqXYiU0TeA_vMHcSAto";

const supabaseClient =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


// ======================================================
// BOOKING ELEMENTS
// ======================================================

const bookingForm =
document.getElementById("bookingForm");

const message =
document.getElementById("message");

const totalDisplay =
document.getElementById("total");

const basePriceDisplay =
document.getElementById("basePrice");

const addonTotalDisplay =
document.getElementById("addonTotal");

const dateInput =
document.getElementById("date");

const timeInput =
document.getElementById("time");

const nailLengthInput =
document.getElementById("nailLength");


// ======================================================
// VARIABLES
// ======================================================

let blockedDates = [];
let blockedTimes = [];
let bookedTimes = [];
let currentCustomerBooking = null;
let currentDateAppointmentTimes = [];


// ======================================================
// APPOINTMENT TIMES
// ======================================================

const appointmentTimes = [
    { value: "09:00:00", label: "9:00 AM" },
    { value: "10:00:00", label: "10:00 AM" },
    { value: "11:00:00", label: "11:00 AM" },
    { value: "12:00:00", label: "12:00 PM" },
    { value: "13:00:00", label: "1:00 PM" },
    { value: "14:00:00", label: "2:00 PM" },
    { value: "15:00:00", label: "3:00 PM" },
    { value: "16:00:00", label: "4:00 PM" },
    { value: "17:00:00", label: "5:00 PM" },
    { value: "18:00:00", label: "6:00 PM" },
    { value: "19:00:00", label: "7:00 PM" }
];


// ======================================================
// NAIL PRICES
// ======================================================

const nailPrices = {
    Short: 50,
    Medium: 55,
    Long: 60,
    XL: 65
};


// ======================================================
// CALCULATE TOTAL
// ======================================================

function calculateTotal() {

    const nailLength = nailLengthInput.value;
    const basePrice = nailPrices[nailLength] || 0;

    const selectedDesigns =
    document.querySelectorAll(
        'input[name="design"]:checked'
    );

    let addonTotal = 0;

    selectedDesigns.forEach(function(design) {
        addonTotal += Number(design.dataset.price) || 0;
    });

    const total = basePrice + addonTotal;

    basePriceDisplay.textContent =
        "$" + basePrice.toFixed(2);

    addonTotalDisplay.textContent =
        "$" + addonTotal.toFixed(2);

    totalDisplay.textContent =
        "$" + total.toFixed(2);

    return total;
}


// ======================================================
// PRICE EVENTS
// ======================================================

nailLengthInput.addEventListener(
    "change",
    calculateTotal
);

document
.querySelectorAll('input[name="design"]')
.forEach(function(checkbox) {

    checkbox.addEventListener(
        "change",
        calculateTotal
    );

});


// ======================================================
// LOAD BLOCKED DATES
// ======================================================

async function loadBlockedDates() {

    const result = await supabaseClient
        .from("blocked_dates")
        .select("date");

    if (result.error) {
        console.error(
            "Blocked date error:",
            result.error
        );
        return;
    }

    blockedDates = (result.data || []).map(
        function(item) {
            return item.date;
        }
    );
}


// ======================================================
// LOAD BLOCKED HOURS FOR A DATE
// ======================================================

async function loadBlockedTimes(date) {

    blockedTimes = [];

    if (!date) {
        return;
    }

    const result = await supabaseClient
        .from("blocked_times")
        .select("date,start_time,end_time,reason")
        .eq("date", date);

    if (result.error) {
        console.error(
            "Blocked hours error:",
            result.error
        );
        return;
    }

    blockedTimes = result.data || [];
}


// ======================================================
// CONVERT TIME TO MINUTES
// ======================================================

function timeToMinutes(time) {

    if (!time) {
        return NaN;
    }

    const parts = String(time).split(":");

    return (
        Number(parts[0]) * 60 +
        Number(parts[1] || 0)
    );
}


// ======================================================
// CHECK IF AN APPOINTMENT START TIME IS BLOCKED
// ======================================================

function isTimeBlocked(date, time) {

    if (!date || !time) {
        return false;
    }

    const selectedMinutes = timeToMinutes(time);

    return blockedTimes.some(function(block) {

        if (block.date !== date) {
            return false;
        }

        const startMinutes =
            timeToMinutes(block.start_time);

        const endMinutes =
            timeToMinutes(block.end_time);

        return (
            selectedMinutes >= startMinutes &&
            selectedMinutes < endMinutes
        );
    });
}


// ======================================================
// CHECK BLOCKED DATE
// ======================================================

function isDateBlocked(date) {
    return blockedDates.includes(date);
}


// ======================================================
// NORMALIZE TIME
// ======================================================

function normalizeTime(time) {

    if (!time) {
        return "";
    }

    const parts = String(time).split(":");

    if (parts.length < 2) {
        return time;
    }

    const hour = String(
        parseInt(parts[0], 10)
    ).padStart(2, "0");

    const minutes = String(parts[1]).padStart(2, "0");

    return hour + ":" + minutes + ":00";
}


// ======================================================
// WEEKLY AND SPECIAL BUSINESS HOURS
// ======================================================

function dateToWeekday(dateString) {
    const parts = String(dateString).split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getDay();
}

async function getBusinessHoursForDate(dateString) {
    if (!dateString) throw new Error("Please select a date.");

    const special = await supabaseClient
        .from("business_hour_overrides")
        .select("date,is_open,open_time,close_time")
        .eq("date", dateString)
        .maybeSingle();

    if (special.error) {
        console.error("Special business hours error:", special.error);
        throw new Error("Could not verify special business hours. Please try again.");
    }
    if (special.data) return special.data;

    const weekly = await supabaseClient
        .from("business_hours")
        .select("weekday,is_open,open_time,close_time")
        .eq("weekday", dateToWeekday(dateString))
        .maybeSingle();

    if (weekly.error) {
        console.error("Weekly business hours error:", weekly.error);
        throw new Error("Could not verify weekly business hours. Please try again.");
    }
    if (!weekly.data) throw new Error("Business hours are not configured for this day.");
    return weekly.data;
}

async function getAppointmentTimesForDate(dateString) {
    const hours = await getBusinessHoursForDate(dateString);
    if (!hours.is_open || !hours.open_time || !hours.close_time) return [];

    const opening = timeToMinutes(hours.open_time);
    const closing = timeToMinutes(hours.close_time);
    if (!Number.isFinite(opening) || !Number.isFinite(closing) || closing <= opening) return [];

    const slots = [];
    for (let minutes = opening; minutes < closing; minutes += 60) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        const value = String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0") + ":00";
        const label = (hour % 12 || 12) + ":" + String(minute).padStart(2, "0") + " " + (hour >= 12 ? "PM" : "AM");
        slots.push({ value, label });
    }
    return slots;
}


// ======================================================
// LOAD BOOKED TIMES
// ======================================================

async function loadBookedTimes(date) {
    bookedTimes = [];
    currentDateAppointmentTimes = [];
    if (!date) { resetTimeOptions(); return; }

    await loadBlockedDates();
    if (isDateBlocked(date)) { disableAllTimes(); return; }

    timeInput.innerHTML = "";
    const loading = new Option("Checking availability...", "");
    loading.disabled = true; loading.selected = true;
    timeInput.add(loading);

    try {
        currentDateAppointmentTimes = await getAppointmentTimesForDate(date);
    } catch (error) {
        console.error("Business hours error:", error);
        resetTimeOptions();
        message.textContent = error.message || "Could not verify business hours.";
        message.className = "error";
        return;
    }

    if (!currentDateAppointmentTimes.length) {
        disableAllTimes();
        message.textContent = "The business is closed on this date. Please choose another date. 💗";
        message.className = "error";
        return;
    }

    await loadBlockedTimes(date);
    const result = await supabaseClient.from("bookings").select("time,status").eq("date", date);
    if (result.error) {
        console.error("Availability error:", result.error);
        resetTimeOptions();
        message.textContent = "Could not check availability. Please try again.";
        message.className = "error";
        return;
    }

    bookedTimes = (result.data || [])
        .filter(booking => booking.status !== "Cancelled")
        .map(booking => normalizeTime(booking.time));
    renderTimeOptions();

    const availableCount = currentDateAppointmentTimes.filter(time =>
        !bookedTimes.includes(time.value) && !isTimeBlocked(date, time.value)
    ).length;
    message.textContent = availableCount
        ? availableCount + " appointment time" + (availableCount === 1 ? "" : "s") + " available. 💗"
        : "No appointment times are available on this date. Please choose another date. 💗";
    message.className = availableCount ? "success" : "error";
}


// ======================================================
// RENDER AVAILABLE APPOINTMENT TIMES
// ======================================================

function renderTimeOptions() {
    timeInput.innerHTML = "";
    timeInput.add(new Option("Select a time", ""));
    const selectedDate = dateInput.value;
    currentDateAppointmentTimes.forEach(function(time) {
        const option = new Option(time.label + " — Available", time.value);
        if (isTimeBlocked(selectedDate, time.value)) {
            option.textContent = time.label + " — UNAVAILABLE"; option.disabled = true;
        } else if (bookedTimes.includes(time.value)) {
            option.textContent = time.label + " — BOOKED"; option.disabled = true;
        }
        timeInput.add(option);
    });
}



// ======================================================
// RESET TIME OPTIONS
// ======================================================

function resetTimeOptions() {

    timeInput.innerHTML = "";

    const option = document.createElement("option");

    option.value = "";
    option.textContent = "Select a date first";
    option.selected = true;

    timeInput.appendChild(option);

}


// ======================================================
// DISABLE ALL TIMES
// ======================================================

function disableAllTimes() {

    timeInput.innerHTML = "";

    const first = document.createElement("option");

    first.value = "";
    first.textContent = "Date unavailable";
    first.disabled = true;
    first.selected = true;

    timeInput.appendChild(first);

    (currentDateAppointmentTimes.length ? currentDateAppointmentTimes : appointmentTimes).forEach(function(time) {

        const option = document.createElement("option");

        option.value = time.value;

        option.textContent =
            time.label + " — Unavailable";

        option.disabled = true;

        timeInput.appendChild(option);

    });

}


// ======================================================
// DATE CHANGE
// ======================================================

dateInput.addEventListener(
    "change",
    async function() {

        const date = dateInput.value;

        message.textContent = "";
        message.className = "";

        if (!date) {
            resetTimeOptions();
            return;
        }

        // Refresh blocked dates in case the admin
        // changed availability after the page loaded.

        await loadBlockedDates();

        if (isDateBlocked(date)) {

            message.textContent =
                "This date is unavailable. Please choose another date. 💗";

            message.className = "error";

            disableAllTimes();

            return;
        }

        await loadBookedTimes(date);

    }
);


// ======================================================
// TIME CHANGE
// ======================================================

timeInput.addEventListener(
    "change",
    function() {

        const selectedTime = timeInput.value;
        const selectedDate = dateInput.value;

        if (isTimeBlocked(selectedDate, selectedTime)) {

            message.textContent =
                "That appointment hour is unavailable. Please choose another time.";

            message.className = "error";

            timeInput.value = "";

            return;
        }

        if (
            bookedTimes.includes(
                normalizeTime(selectedTime)
            )
        ) {

            message.textContent =
                "That time is already booked.";

            message.className = "error";

            timeInput.value = "";

            return;
        }

        message.textContent = "";
        message.className = "";

    }
);


// ======================================================
// MINIMUM BOOKING DATE
// ======================================================

const today =
    new Date().toISOString().split("T")[0];

dateInput.min = today;


// ======================================================
// INITIAL LOAD
// ======================================================

loadBlockedDates();

resetTimeOptions();

calculateTotal();


// ======================================================
// FINAL TIME AVAILABILITY CHECK
// ======================================================

async function checkTimeAvailability(date, time) {

    let allowedTimes;
    try {
        allowedTimes = await getAppointmentTimesForDate(date);
    } catch (error) {
        console.error("Business hours check failed:", error);
        return { available: false, reason: error.message || "Could not verify business hours." };
    }
    if (!allowedTimes.length) return { available: false, reason: "The business is closed on that date." };
    if (!allowedTimes.some(item => item.value === normalizeTime(time))) {
        return { available: false, reason: "That time is outside business hours. Please choose another time." };
    }

    // Refresh the blocked dates before allowing a booking.

    await loadBlockedDates();

    if (isDateBlocked(date)) {

        return {
            available: false,
            reason: "This date is unavailable."
        };

    }

    // Refresh blocked hours for the selected date.

    await loadBlockedTimes(date);

    if (isTimeBlocked(date, time)) {

        return {
            available: false,
            reason:
                "That appointment hour is unavailable. Please choose another time."
        };

    }

    const result = await supabaseClient
        .from("bookings")
        .select("id,status")
        .eq("date", date)
        .eq("time", time);

    if (result.error) {

        console.error(
            "Final availability check error:",
            result.error
        );

        return {
            available: false,
            reason: "Could not verify availability. Please try again."
        };

    }

    const activeBookings = (result.data || [])
        .filter(function(booking) {
            return booking.status !== "Cancelled";
        });

    if (activeBookings.length > 0) {

        return {
            available: false,
            reason:
                "That appointment time was just booked. Please choose another time."
        };

    }

    return {
        available: true,
        reason: ""
    };

}


// ======================================================
// SUBMIT BOOKING
// ======================================================

bookingForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const name =
            document.getElementById("name").value.trim();

        const email =
            document.getElementById("email")
                .value.trim().toLowerCase();

        const phone =
            document.getElementById("phone").value.trim();

        const instagram =
            document.getElementById("instagram").value.trim();

        const date = dateInput.value;
        const time = timeInput.value;

        const nailLength = nailLengthInput.value;

        const inspiration =
            document.getElementById("inspiration").value.trim();

        if (!date) {

            message.textContent = "Please select a date.";
            message.className = "error";

            return;
        }

        if (!time) {

            message.textContent =
                "Please select an available time.";

            message.className = "error";

            return;
        }

        if (!nailLength) {

            message.textContent =
                "Please select a nail length.";

            message.className = "error";

            return;
        }

        // Check the latest availability before saving.

        message.textContent = "Checking availability...";
        message.className = "loading";

        const availability =
            await checkTimeAvailability(date, time);

        if (!availability.available) {

            message.textContent = availability.reason;
            message.className = "error";

            await loadBlockedDates();

            if (isDateBlocked(date)) {
                disableAllTimes();
            } else {
                await loadBookedTimes(date);
            }

            return;
        }

        const selectedDesigns = Array.from(
            document.querySelectorAll(
                'input[name="design"]:checked'
            )
        ).map(function(design) {
            return design.value;
        });

        const total = calculateTotal();

        message.textContent =
            "Submitting your booking...";

        message.className = "loading";

        const booking = {

            name: name,

            email: email,

            phone: phone,

            date: date,

            time: time,

            nail_length: nailLength,

            designs: selectedDesigns.length
                ? selectedDesigns.join(", ")
                : "None",

            instagram: instagram,

            inspiration: inspiration,

            total: total,

            status: "Pending Deposit"

        };

        const result = await supabaseClient
            .from("bookings")
            .insert([booking]);

        if (result.error) {

            console.error(
                "Booking error:",
                result.error
            );

            message.textContent =
                "Something went wrong: " +
                result.error.message;

            message.className = "error";

            return;
        }

        message.textContent =
            "Booking submitted! 💗 Sending confirmation...";

        message.className = "loading";

        try {

            const emailResponse =
                await supabaseClient.functions.invoke(
                    "send-booking-email",
                    {
                        body: booking
                    }
                );

            if (emailResponse.error) {

                console.error(
                    "Booking email error:",
                    emailResponse.error
                );

                message.textContent =
                    "Booking submitted! 💗 Please send the $15 deposit to $Jamiiamariee1 to secure your appointment.";

            } else {

                message.textContent =
                    "Booking submitted! 💗 A confirmation email has been sent. Please send the $15 deposit to $Jamiiamariee1 to secure your appointment.";

            }

            message.className = "success";

        } catch (error) {

            console.error(
                "Booking email error:",
                error
            );

            message.textContent =
                "Booking submitted! 💗 Please send the $15 deposit to $Jamiiamariee1 to secure your appointment.";

            message.className = "success";

        }

        bookingForm.reset();

        basePriceDisplay.textContent = "$0.00";
        addonTotalDisplay.textContent = "$0.00";
        totalDisplay.textContent = "$0.00";

        resetTimeOptions();

        bookedTimes = [];
        blockedTimes = [];

    }
);

// ======================================================
// CUSTOMER APPOINTMENT MANAGEMENT
// ======================================================


// ======================================================
// FIND APPOINTMENT
// ======================================================

async function findMyAppointment() {

    const emailInput =
        document.getElementById("manageEmail");

    const dateInputManage =
        document.getElementById("manageDate");

    const manageMessage =
        document.getElementById("manageMessage");

    const resultDiv =
        document.getElementById("appointmentResult");

    const email = emailInput.value.trim().toLowerCase();
    const date = dateInputManage.value;

    manageMessage.textContent = "";
    manageMessage.className = "";
    resultDiv.innerHTML = "";

    if (!email || !date) {

        manageMessage.textContent =
            "Please enter your email and appointment date.";

        manageMessage.className = "error";

        return;
    }

    manageMessage.textContent =
        "Looking for your appointment...";

    manageMessage.className = "loading";

    const result = await supabaseClient
        .from("bookings")
        .select("*")
        .ilike("email", email)
        .eq("date", date)
        .neq("status", "Cancelled");

    if (result.error) {

        console.error(
            "Find appointment error:",
            result.error
        );

        manageMessage.textContent =
            "Could not find your appointment. " +
            result.error.message;

        manageMessage.className = "error";

        return;
    }

    if (!result.data || result.data.length === 0) {

        manageMessage.textContent =
            "No active appointment was found with that email and date.";

        manageMessage.className = "error";

        return;
    }

    if (result.data.length > 1) {

        manageMessage.textContent =
            "Multiple appointments were found. Please contact me directly to manage them.";

        manageMessage.className = "error";

        return;
    }

    currentCustomerBooking = result.data[0];

    manageMessage.textContent =
        "Appointment found! 💗";

    manageMessage.className = "success";

    renderCustomerAppointment(currentCustomerBooking);
}


// ======================================================
// RENDER CUSTOMER APPOINTMENT
// ======================================================

function renderCustomerAppointment(booking) {

    const resultDiv =
        document.getElementById("appointmentResult");

    const formattedDate =
        formatCustomerDate(booking.date);

    const formattedTime =
        formatCustomerTime(booking.time);

    resultDiv.innerHTML = `

        <div class="appointment-card">

            <h3>Your Appointment</h3>

            <span class="appointment-status ${
                booking.status === "Confirmed"
                    ? "confirmed"
                    : ""
            }">
                ${escapeHTML(booking.status)}
            </span>

            <p>
                <strong>Name:</strong>
                ${escapeHTML(booking.name)}
            </p>

            <p>
                <strong>Date:</strong>
                ${formattedDate}
            </p>

            <p>
                <strong>Time:</strong>
                ${formattedTime}
            </p>

            <p>
                <strong>Total:</strong>
                $${Number(booking.total || 0).toFixed(2)}
            </p>

            <div class="manage-actions">

                <button
                    type="button"
                    class="btn reschedule-appointment-button"
                    onclick="showRescheduleArea()"
                >
                    📅 Reschedule
                </button>

                <button
                    type="button"
                    class="btn cancel-appointment-button"
                    onclick="cancelCustomerAppointment()"
                >
                    ❌ Cancel Appointment
                </button>

            </div>

        </div>
    `;
}


// ======================================================
// SHOW RESCHEDULE AREA
// ======================================================

function showRescheduleArea() {

    if (!currentCustomerBooking) {
        return;
    }

    const area =
        document.getElementById("rescheduleArea");

    area.style.display = "block";

    const today =
        new Date().toISOString().split("T")[0];

    document.getElementById("newDate").min = today;

    area.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


// ======================================================
// NEW RESCHEDULE DATE
// ======================================================

document
.getElementById("newDate")
.addEventListener(
    "change",
    async function() {

        const newDate = this.value;

        const newTime =
            document.getElementById("newTime");

        if (!newDate) {

            newTime.innerHTML = `
                <option value="">
                    Select a date first
                </option>
            `;

            return;
        }

        await loadBlockedDates();

        if (isDateBlocked(newDate)) {

            newTime.innerHTML = `
                <option value="">
                    Date unavailable
                </option>
            `;

            return;
        }

        await loadBlockedTimes(newDate);

        newTime.innerHTML = `
            <option value="">
                Checking availability...
            </option>
        `;

        const result = await supabaseClient
            .from("bookings")
            .select("time,status,id")
            .eq("date", newDate);

        if (result.error) {

            console.error(
                "Reschedule availability error:",
                result.error
            );

            newTime.innerHTML = `
                <option value="">
                    Could not check availability
                </option>
            `;

            return;
        }

        const unavailableTimes = (result.data || [])
            .filter(function(booking) {

                return (
                    booking.status !== "Cancelled" &&
                    String(booking.id) !==
                    String(currentCustomerBooking.id)
                );

            })
            .map(function(booking) {
                return normalizeTime(booking.time);
            });

        newTime.innerHTML = `
            <option value="">
                Select a new time
            </option>
        `;

        let rescheduleTimes = [];
        try {
            rescheduleTimes = await getAppointmentTimesForDate(newDate);
        } catch (error) {
            console.error("Reschedule business hours error:", error);
            newTime.innerHTML = '<option value="">Could not verify business hours</option>';
            return;
        }
        if (!rescheduleTimes.length) {
            newTime.innerHTML = '<option value="">Business closed on this date</option>';
            return;
        }

        rescheduleTimes.forEach(function(time) {

            const option =
                document.createElement("option");

            option.value = time.value;

            if (isTimeBlocked(newDate, time.value)) {

                option.textContent =
                    time.label + " — UNAVAILABLE";

                option.disabled = true;

            } else if (unavailableTimes.includes(time.value)) {

                option.textContent =
                    time.label + " — BOOKED";

                option.disabled = true;

            } else {

                option.textContent =
                    time.label + " — Available";
            }

            newTime.appendChild(option);

        });

    }
);


// ======================================================
// RESCHEDULE APPOINTMENT
// ======================================================

async function rescheduleAppointment() {

    if (!currentCustomerBooking) {
        return;
    }

    const newDate =
        document.getElementById("newDate").value;

    const newTime =
        document.getElementById("newTime").value;

    const manageMessage =
        document.getElementById("manageMessage");

    if (!newDate || !newTime) {

        manageMessage.textContent =
            "Please choose a new date and time.";

        manageMessage.className = "error";

        return;
    }

    await loadBlockedDates();

    if (isDateBlocked(newDate)) {

        manageMessage.textContent =
            "That date is unavailable.";

        manageMessage.className = "error";

        return;
    }

    await loadBlockedTimes(newDate);

    if (isTimeBlocked(newDate, newTime)) {

        manageMessage.textContent =
            "That appointment hour is unavailable. Please choose another time.";

        manageMessage.className = "error";

        return;
    }

    manageMessage.textContent =
        "Checking availability...";

    manageMessage.className = "loading";

    const availability =
        await checkCustomerRescheduleAvailability(
            newDate,
            newTime,
            currentCustomerBooking.id
        );

    if (!availability.available) {

        manageMessage.textContent =
            availability.reason;

        manageMessage.className = "error";

        return;
    }

    const confirmed = confirm(
        "Are you sure you want to reschedule your appointment to " +
        formatCustomerDate(newDate) +
        " at " +
        formatCustomerTime(newTime) +
        "?"
    );

    if (!confirmed) {
        return;
    }

    manageMessage.textContent =
        "Rescheduling appointment...";

    manageMessage.className = "loading";

    const result = await supabaseClient
        .from("bookings")
        .update({
            date: newDate,
            time: newTime,
            updated_at: new Date().toISOString()
        })
        .eq("id", currentCustomerBooking.id);

    if (result.error) {

        console.error(
            "Reschedule error:",
            result.error
        );

        manageMessage.textContent =
            "Could not reschedule your appointment: " +
            result.error.message;

        manageMessage.className = "error";

        return;
    }

    currentCustomerBooking.date = newDate;
    currentCustomerBooking.time = newTime;

    document.getElementById("rescheduleArea").style.display =
        "none";

    manageMessage.textContent =
        "Appointment successfully rescheduled! 💗";

    manageMessage.className = "success";

    renderCustomerAppointment(currentCustomerBooking);

    try {

        const emailResponse =
            await supabaseClient.functions.invoke(
                "send-status-email",
                {
                    body: {
                        name: currentCustomerBooking.name,
                        email: currentCustomerBooking.email,
                        status: "Rescheduled",
                        date: newDate,
                        time: newTime
                    }
                }
            );

        if (emailResponse.error) {
            console.error(
                "Reschedule email error:",
                emailResponse.error
            );
        }

    } catch (error) {

        console.error(
            "Reschedule email error:",
            error
        );

    }

}


// ======================================================
// CHECK RESCHEDULE AVAILABILITY
// ======================================================

async function checkCustomerRescheduleAvailability(
    date,
    time,
    currentBookingId
) {

    let allowedTimes;
    try {
        allowedTimes = await getAppointmentTimesForDate(date);
    } catch (error) {
        console.error("Reschedule hours check failed:", error);
        return { available: false, reason: error.message || "Could not verify business hours." };
    }
    if (!allowedTimes.length) return { available: false, reason: "The business is closed on that date." };
    if (!allowedTimes.some(item => item.value === normalizeTime(time))) {
        return { available: false, reason: "That time is outside business hours." };
    }

    await loadBlockedDates();
    if (isDateBlocked(date)) {
        return { available: false, reason: "That date is unavailable." };
    }

    await loadBlockedTimes(date);

    if (isTimeBlocked(date, time)) {

        return {
            available: false,
            reason:
                "That appointment hour is unavailable."
        };

    }

    const result = await supabaseClient
        .from("bookings")
        .select("id,status")
        .eq("date", date)
        .eq("time", time);

    if (result.error) {

        return {
            available: false,
            reason: "Could not check that appointment time."
        };

    }

    const activeBooking = (result.data || []).find(
        function(booking) {

            return (
                booking.status !== "Cancelled" &&
                String(booking.id) !==
                String(currentBookingId)
            );

        }
    );

    if (activeBooking) {

        return {
            available: false,
            reason:
                "That time is already booked. Please choose another time."
        };

    }

    return {
        available: true,
        reason: ""
    };

}

// ======================================================
// CANCEL CUSTOMER APPOINTMENT
// ======================================================

async function cancelCustomerAppointment() {

    if (!currentCustomerBooking) {
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to cancel your appointment?"
    );

    if (!confirmed) {
        return;
    }

    const manageMessage =
        document.getElementById("manageMessage");

    manageMessage.textContent =
        "Cancelling appointment...";

    manageMessage.className = "loading";

    const result = await supabaseClient
        .from("bookings")
        .update({
            status: "Cancelled",
            updated_at: new Date().toISOString()
        })
        .eq("id", currentCustomerBooking.id);

    if (result.error) {

        console.error(
            "Cancel appointment error:",
            result.error
        );

        manageMessage.textContent =
            "Could not cancel your appointment: " +
            result.error.message;

        manageMessage.className = "error";

        return;
    }

    currentCustomerBooking.status = "Cancelled";

    manageMessage.textContent =
        "Your appointment has been cancelled.";

    manageMessage.className = "success";

    document.getElementById("rescheduleArea").style.display =
        "none";

    renderCustomerAppointment(currentCustomerBooking);

    try {

        const emailResponse =
            await supabaseClient.functions.invoke(
                "send-status-email",
                {
                    body: {
                        name: currentCustomerBooking.name,
                        email: currentCustomerBooking.email,
                        status: "Cancelled",
                        date: currentCustomerBooking.date,
                        time: currentCustomerBooking.time
                    }
                }
            );

        if (emailResponse.error) {

            console.error(
                "Cancellation email error:",
                emailResponse.error
            );

        }

    } catch (error) {

        console.error(
            "Cancellation email error:",
            error
        );

    }

}


// ======================================================
// FORMAT CUSTOMER DATE
// ======================================================

function formatCustomerDate(date) {

    if (!date) {
        return "Not provided";
    }

    const parts = String(date).split("-");

    if (parts.length !== 3) {
        return escapeHTML(date);
    }

    return (
        parts[1] +
        "/" +
        parts[2] +
        "/" +
        parts[0]
    );

}


// ======================================================
// FORMAT CUSTOMER TIME
// ======================================================

function formatCustomerTime(time) {

    if (!time) {
        return "Not provided";
    }

    const parts = String(time).split(":");

    let hour = parseInt(parts[0], 10);

    const minutes = parts[1] || "00";

    if (Number.isNaN(hour)) {
        return escapeHTML(time);
    }

    const ampm = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return hour + ":" + minutes + " " + ampm;

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ======================================================
// END OF SCRIPT
// ======================================================

/* ==========================================
   CUSTOMER APPOINTMENT RESCHEDULING
   Uses the existing index.html fields:
   manageEmail, manageDate, manageMessage,
   appointmentResult, rescheduleArea,
   newDate, newTime
========================================== */

let customerAppointment = null;

function customerDateString(date) {
  return date.getFullYear() + "-" +
    String(date.getMonth() + 1).padStart(2, "0") + "-" +
    String(date.getDate()).padStart(2, "0");
}

function customerFormatDate(date) {
  if (!date) return "Not provided";
  const parts = String(date).split("-");
  return parts.length === 3
    ? parts[1] + "/" + parts[2] + "/" + parts[0]
    : date;
}

function customerFormatTime(time) {
  if (!time) return "Not provided";

  const parts = String(time).split(":");
  let hour = Number(parts[0]);
  const minutes = parts[1] || "00";
  const ampm = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;
  return hour + ":" + minutes + " " + ampm;
}

function customerTimeMinutes(time) {
  const parts = String(time || "").slice(0, 5).split(":");
  return Number(parts[0]) * 60 + Number(parts[1] || 0);
}

function customerMessage(text, isError = false) {
  const element = document.getElementById("manageMessage");
  element.textContent = text;
  element.style.color = isError ? "#c00000" : "#25833a";
}

function customerEscapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

/* FIND APPOINTMENT */

async function findMyAppointment() {
  const email = document.getElementById("manageEmail").value.trim();
  const date = document.getElementById("manageDate").value;
  const result = document.getElementById("appointmentResult");
  const rescheduleArea = document.getElementById("rescheduleArea");

  result.innerHTML = "";
  rescheduleArea.style.display = "none";
  customerAppointment = null;

  if (!email || !date) {
    customerMessage("Enter your booking email and current appointment date.", true);
    return;
  }

  customerMessage("Looking for your appointment...");

  const { data, error } = await supabaseClient
    .from("bookings")
    .select("*")
    .eq("email", email)
    .eq("date", date)
    .neq("status", "Cancelled")
    .order("time", { ascending: true });

  if (error) {
    console.error("Find appointment error:", error);
    customerMessage("Could not look up your appointment. Please try again.", true);
    return;
  }

  if (!data || data.length === 0) {
    customerMessage("No active appointment found for that email and date.", true);
    return;
  }

  if (data.length > 1) {
    customerMessage(
      "More than one appointment matches. Please contact the nail tech so the correct booking can be identified.",
      true
    );
    return;
  }

  customerAppointment = data[0];

  result.innerHTML = `
    <div class="appointment-card">
      <h3>Appointment Found 💗</h3>
      <p><strong>Name:</strong> ${customerEscapeHTML(customerAppointment.name)}</p>
      <p><strong>Date:</strong> ${customerEscapeHTML(customerFormatDate(customerAppointment.date))}</p>
      <p><strong>Time:</strong> ${customerEscapeHTML(customerFormatTime(customerAppointment.time))}</p>
      <p><strong>Status:</strong> ${customerEscapeHTML(customerAppointment.status || "Pending Deposit")}</p>
      <button type="button" class="btn" id="openCustomerReschedule">
        Reschedule Appointment
      </button>
    </div>
  `;

  document.getElementById("openCustomerReschedule")
    .addEventListener("click", async () => {
      rescheduleArea.style.display = "block";

      const dateInput = document.getElementById("newDate");
      dateInput.min = customerDateString(new Date());
      dateInput.value = customerAppointment.date;

      await loadCustomerRescheduleTimes();
    });

  customerMessage("Your appointment was found.");
}

/* LOAD AVAILABLE TIMES */

async function loadCustomerRescheduleTimes() {
  const select = document.getElementById("newTime");
  const date = document.getElementById("newDate").value;

  select.innerHTML = '<option value="">Loading times...</option>';

  if (!customerAppointment) {
    select.innerHTML = '<option value="">Find your appointment first</option>';
    return;
  }

  if (!date) {
    select.innerHTML = '<option value="">Choose a date first</option>';
    return;
  }

  if (date < customerDateString(new Date())) {
    select.innerHTML = '<option value="">Choose today or a future date</option>';
    return;
  }

  const [blockedDateResult, blockedTimeResult, bookingsResult] =
    await Promise.all([
      supabaseClient.from("blocked_dates")
        .select("date")
        .eq("date", date),

      supabaseClient.from("blocked_times")
        .select("*")
        .eq("date", date),

      supabaseClient.from("bookings")
        .select("id,time,status")
        .eq("date", date)
    ]);

  if (blockedDateResult.error ||
      blockedTimeResult.error ||
      bookingsResult.error) {
    console.error(
      blockedDateResult.error,
      blockedTimeResult.error,
      bookingsResult.error
    );

    select.innerHTML = '<option value="">Could not load availability</option>';
    return;
  }

  if ((blockedDateResult.data || []).length > 0) {
    select.innerHTML = '<option value="">This date is unavailable</option>';
    return;
  }

  const blockedTimes = blockedTimeResult.data || [];

  const bookedTimes = (bookingsResult.data || [])
    .filter(booking =>
      String(booking.id) !== String(customerAppointment.id) &&
      booking.status !== "Cancelled"
    )
    .map(booking => String(booking.time || "").slice(0, 5));

  select.innerHTML = '<option value="">Choose an available time</option>';

  /* Appointment starts from 9 AM through 7 PM.
     Each appointment occupies one hour. */

  for (let hour = 9; hour <= 19; hour++) {
    const time = String(hour).padStart(2, "0") + ":00";
    const endTime = String(hour + 1).padStart(2, "0") + ":00";

    const overlapsBlockedTime = blockedTimes.some(block =>
      customerTimeMinutes(time) < customerTimeMinutes(block.end_time) &&
      customerTimeMinutes(endTime) > customerTimeMinutes(block.start_time)
    );

    const isCurrentSlot =
      date === customerAppointment.date &&
      time === String(customerAppointment.time || "").slice(0, 5);

    if (
      !overlapsBlockedTime &&
      (!bookedTimes.includes(time) || isCurrentSlot)
    ) {
      const option = document.createElement("option");
      option.value = time;
      option.textContent = customerFormatTime(time);
      select.appendChild(option);
    }
  }

  if (select.options.length === 1) {
    select.innerHTML = '<option value="">No times available</option>';
    return;
  }

  if (date === customerAppointment.date) {
    select.value = String(customerAppointment.time || "").slice(0, 5);
  }
}

/* SAVE RESCHEDULE */

async function rescheduleAppointment() {
  if (!customerAppointment) {
    customerMessage("Find your appointment first.", true);
    return;
  }

  const newDate = document.getElementById("newDate").value;
  const newTime = document.getElementById("newTime").value;

  if (!newDate || !newTime) {
    customerMessage("Choose a new date and available time.", true);
    return;
  }

  if (newDate < customerDateString(new Date())) {
    customerMessage("Choose today or a future date.", true);
    return;
  }

  if (
    newDate === customerAppointment.date &&
    newTime === String(customerAppointment.time || "").slice(0, 5)
  ) {
    customerMessage("Choose a different date or time.", true);
    return;
  }

  customerMessage("Checking availability...");

  /* Recheck availability immediately before saving. */

  const [blockedDateResult, blockedTimeResult, bookingsResult] =
    await Promise.all([
      supabaseClient.from("blocked_dates")
        .select("date")
        .eq("date", newDate),

      supabaseClient.from("blocked_times")
        .select("*")
        .eq("date", newDate),

      supabaseClient.from("bookings")
        .select("id,time,status")
        .eq("date", newDate)
    ]);

  if (
    blockedDateResult.error ||
    blockedTimeResult.error ||
    bookingsResult.error
  ) {
    customerMessage("Could not verify availability. Please try again.", true);
    return;
  }

  if ((blockedDateResult.data || []).length > 0) {
    customerMessage("That date is blocked. Choose another date.", true);
    return;
  }

  const start = customerTimeMinutes(newTime);
  const end = start + 60;

  const overlapsBlockedTime = (blockedTimeResult.data || []).some(block =>
    start < customerTimeMinutes(block.end_time) &&
    end > customerTimeMinutes(block.start_time)
  );

  if (overlapsBlockedTime) {
    customerMessage("That time is blocked. Choose another time.", true);
    await loadCustomerRescheduleTimes();
    return;
  }

  const slotTaken = (bookingsResult.data || []).some(booking =>
    String(booking.id) !== String(customerAppointment.id) &&
    booking.status !== "Cancelled" &&
    String(booking.time || "").slice(0, 5) === newTime
  );

  if (slotTaken) {
    customerMessage("That time has already been booked. Choose another.", true);
    await loadCustomerRescheduleTimes();
    return;
  }

  const oldDate = customerAppointment.date;
  const oldTime = customerAppointment.time;

  customerMessage("Saving your new appointment...");

  const { data, error } = await supabaseClient
    .from("bookings")
    .update({
      date: newDate,
      time: newTime,
      status: "Rescheduled"
    })
    .eq("id", customerAppointment.id)
    .eq("email", document.getElementById("manageEmail").value.trim())
    .select();

  if (error || !data || data.length === 0) {
    console.error("Reschedule error:", error);
    customerMessage(
      "Could not reschedule. Please contact the nail tech if this keeps happening.",
      true
    );
    return;
  }

  customerAppointment = data[0];

  /* Try to notify the customer through the existing Edge Function. */

  let message = "Your appointment has been rescheduled successfully! 💗";

  try {
    const emailResult = await supabaseClient.functions.invoke(
      "send-status-email",
      {
        body: {
          name: customerAppointment.name,
          email: customerAppointment.email,
          status: "Rescheduled",
          date: newDate,
          time: newTime,
          old_date: oldDate,
          old_time: oldTime
        }
      }
    );

    if (emailResult.error) {
      console.error("Reschedule email error:", emailResult.error);
      message += " The confirmation email could not be sent.";
    } else {
      message += " Check your email for confirmation.";
    }
  } catch (emailError) {
    console.error("Reschedule email error:", emailError);
    message += " The confirmation email could not be sent.";
  }

  customerMessage(message);

  document.getElementById("appointmentResult").innerHTML = `
    <div class="appointment-card">
      <h3>Updated Appointment 💗</h3>
      <p><strong>Date:</strong> ${customerEscapeHTML(customerFormatDate(newDate))}</p>
      <p><strong>Time:</strong> ${customerEscapeHTML(customerFormatTime(newTime))}</p>
      <p><strong>Status:</strong> Rescheduled</p>
    </div>
  `;

  document.getElementById("rescheduleArea").style.display = "none";
}

/* Reload times whenever the customer chooses another date. */

document.addEventListener("DOMContentLoaded", () => {
  const newDateInput = document.getElementById("newDate");

  if (newDateInput) {
    newDateInput.addEventListener("change", loadCustomerRescheduleTimes);
  }
});