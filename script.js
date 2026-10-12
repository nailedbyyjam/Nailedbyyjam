
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
// LOAD BOOKED TIMES
// ======================================================

async function loadBookedTimes(date) {

    bookedTimes = [];

    if (!date) {
        resetTimeOptions();
        return;
    }

    if (isDateBlocked(date)) {
        disableAllTimes();
        return;
    }

    await loadBlockedTimes(date);

    timeInput.innerHTML = "";

    const loading = document.createElement("option");

    loading.value = "";
    loading.textContent = "Checking availability...";
    loading.disabled = true;
    loading.selected = true;

    timeInput.appendChild(loading);

    const result = await supabaseClient
        .from("bookings")
        .select("time,status")
        .eq("date", date);

    if (result.error) {
        console.error(
            "Availability error:",
            result.error
        );

        resetTimeOptions();
        return;
    }

    bookedTimes = (result.data || [])
        .filter(function(booking) {
            return booking.status !== "Cancelled";
        })
        .map(function(booking) {
            return normalizeTime(booking.time);
        });

    renderTimeOptions();

    const availableCount = appointmentTimes.filter(
        function(time) {
            return (
                !bookedTimes.includes(time.value) &&
                !isTimeBlocked(date, time.value)
            );
        }
    ).length;

    if (availableCount === 0) {

        message.textContent =
            "No appointment times are available on this date. Please choose another date. 💗";

        message.className = "error";

    } else {

        message.textContent =
            availableCount +
            " appointment time" +
            (availableCount === 1 ? "" : "s") +
            " available. 💗";

        message.className = "success";
    }
}

// ======================================================
// RENDER AVAILABLE APPOINTMENT TIMES
// ======================================================

function renderTimeOptions() {

    timeInput.innerHTML = "";

    const defaultOption = document.createElement("option");

    defaultOption.value = "";
    defaultOption.textContent = "Select a time";
    defaultOption.selected = true;

    timeInput.appendChild(defaultOption);

    const selectedDate = dateInput.value;

    appointmentTimes.forEach(function(time) {

        const option = document.createElement("option");

        option.value = time.value;

        if (isTimeBlocked(selectedDate, time.value)) {

            option.textContent =
                time.label + " — UNAVAILABLE";

            option.disabled = true;

        } else if (bookedTimes.includes(time.value)) {

            option.textContent =
                time.label + " — BOOKED";

            option.disabled = true;

        } else {

            option.textContent =
                time.label + " — Available";
        }

        timeInput.appendChild(option);

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

    appointmentTimes.forEach(function(time) {

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

        appointmentTimes.forEach(function(time) {

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

    await loadBlockedDates();

    if (isDateBlocked(date)) {

        return {
            available: false,
            reason: "That date is unavailable."
        };

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

